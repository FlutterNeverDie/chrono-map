import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";
import { makeProjection } from "../projection";
import { shapeOf, type Shape } from "./polygons";
import type { GlTheme } from "./renderer";

/**
 * WebGL 지도 공용 도형·색 도구(본 지도 GlMap, 주제·전쟁 지도 GlCanvas가 같이 쓴다).
 * 도형은 경도 0 메르카토르 지도 좌표(useMapViewport·features/map baseMap과 같은 투영).
 */
export const glProjection = makeProjection(0);

export type GlShape = Shape & { box: number[]; flat: number[] };
/** 도형 객체마다 한 번만 삼각형으로(연도를 오갈 때 다시 계산하지 않게 - 공용 로더가 도형 객체를 캐시한다) */
const shapes = new WeakMap<object, GlShape>();
export const shapeFor = (f: Feature<Polygon | MultiPolygon>): GlShape => {
  let s = shapes.get(f);
  if (!s) {
    const sh = shapeOf(glProjection, f);
    const flat = sh.rings.flat(2);
    const xs = flat.filter((_, i) => i % 2 === 0);
    const ys = flat.filter((_, i) => i % 2 === 1);
    s = {
      ...sh,
      flat,
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    };
    shapes.set(f, s);
  }
  return s;
};

/** 해안선 도형을 다각형 하나씩으로(나눠 계산하려고) - 같은 해안선이면 같은 조각(삼각형 캐시를 다시 쓰게) */
const pieceCache = new WeakMap<object, Feature<Polygon | MultiPolygon>[]>();
export function landPieces(
  land: FeatureCollection | Feature,
): Feature<Polygon | MultiPolygon>[] {
  let out = pieceCache.get(land);
  if (!out) {
    const feats = ("features" in land ? land.features : [land]).filter(
      (f): f is Feature<Polygon | MultiPolygon> =>
        f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
    );
    out = feats.flatMap((f) =>
      f.geometry.type === "MultiPolygon"
        ? f.geometry.coordinates.map((c): Feature<Polygon> => ({
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: c },
          }))
        : [f],
    );
    pieceCache.set(land, out);
  }
  return out;
}

/**
 * 도형 목록을 6ms씩 나눠 삼각형으로 만든 뒤 done(한 번에 하면 휴대폰에서 연도를 바꾸거나 처음 확대할 때 멈칫했다).
 * 다 될 때까지 부른 쪽은 전 것을 그대로 그린다. 돌려 주는 함수로 그만둔다
 */
export function shapeAll(
  list: Feature<Polygon | MultiPolygon>[],
  done: (shapes: GlShape[]) => void,
): () => void {
  let i = 0;
  let timer = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < list.length && performance.now() - t0 < 6) shapeFor(list[i++]);
    if (i < list.length) {
      timer = window.setTimeout(step, 0);
      return;
    }
    done(list.map(shapeFor));
  };
  step();
  return () => clearTimeout(timer);
}

/**
 * 큰 도형 목록(해안선)은 작업 스레드(triangulate.worker.ts)에서 삼각형으로 만든 뒤 done - 캐시에 있는 것은 바로.
 * 작업 스레드를 만들 수 없으면 화면 스레드에서 나눠서(shapeAll). 돌려 주는 함수로 그만둔다(결과는 그래도 캐시에 넣는다)
 */
let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, (shapes: GlShape[]) => void>();
export function shapeAllOffThread(
  list: Feature<Polygon | MultiPolygon>[],
  done: (shapes: GlShape[]) => void,
): () => void {
  const missing = list.filter((f) => !shapes.has(f));
  if (!missing.length) {
    done(list.map(shapeFor));
    return () => {};
  }
  try {
    if (!worker) {
      worker = new Worker(new URL("./triangulate.worker.ts", import.meta.url));
      worker.onmessage = (
        e: MessageEvent<{ id: number; shapes: GlShape[] }>,
      ) => {
        waiting.get(e.data.id)?.(e.data.shapes);
        waiting.delete(e.data.id);
      };
    }
  } catch {
    return shapeAll(list, done);
  }
  const id = ++seq;
  let alive = true;
  waiting.set(id, (result) => {
    result.forEach((s, i) => shapes.set(missing[i], s));
    if (alive) done(list.map(shapeFor));
  });
  worker.postMessage({ id, geometries: missing.map((f) => f.geometry) });
  return () => {
    alive = false;
  };
}

/** 점이 삼각형들 안에 있는지 */
export function hit(
  s: { flat: number[]; tris: number[]; box: number[] },
  x: number,
  y: number,
) {
  if (x < s.box[0] || x > s.box[2] || y < s.box[1] || y > s.box[3])
    return false;
  const p = s.flat;
  for (let i = 0; i < s.tris.length; i += 3) {
    const a = s.tris[i] * 2;
    const b = s.tris[i + 1] * 2;
    const c = s.tris[i + 2] * 2;
    const d1 =
      (x - p[b]) * (p[a + 1] - p[b + 1]) - (p[a] - p[b]) * (y - p[b + 1]);
    const d2 =
      (x - p[c]) * (p[b + 1] - p[c + 1]) - (p[b] - p[c]) * (y - p[c + 1]);
    const d3 =
      (x - p[a]) * (p[c + 1] - p[a + 1]) - (p[c] - p[a]) * (y - p[a + 1]);
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)))
      return true;
  }
  return false;
}

/** 같은 이름 나라 조각들을 하나로(고른 나라 강조) */
export function merge(list: Shape[]): Shape {
  const out: Shape = { rings: [], holes: [], tris: [] };
  for (const s of list) {
    const base = out.rings.reduce((n, r) => n + r.length, 0);
    out.rings.push(...s.rings);
    out.holes.push(...s.holes);
    for (const i of s.tris) out.tris.push(base + i);
  }
  return out;
}

/** "var(--이름)"이면 el에서 그 CSS 변수 값을, 아니면 그대로 */
export function cssValue(el: Element, value: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(value.trim());
  return m ? getComputedStyle(el).getPropertyValue(m[1]).trim() : value;
}

let probe: CanvasRenderingContext2D | null = null;
/** CSS 색(어떤 문법이든, var(--x)는 el 기준) → [r, g, b, a] 0~1 */
export function cssColor(value: string, el?: Element): number[] {
  probe ??= document.createElement("canvas").getContext("2d", {
    willReadFrequently: true,
  })!;
  const c = probe;
  c.clearRect(0, 0, 1, 1);
  c.fillStyle = "#000";
  c.fillStyle = (el ? cssValue(el, value) : value).trim() || "#000";
  c.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255];
}

export function readTheme(el: Element): GlTheme {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name);
  return {
    ocean: cssColor(v("--map-ocean")),
    land: cssColor(v("--map-land")),
    border: cssColor(v("--map-border")),
    graticule: cssColor(v("--map-graticule")),
    label: cssColor(v("--map-label")),
    pinStroke: cssColor(v("--map-pin-stroke")),
    pinRing: cssColor(v("--map-pin-ring")),
    regionOpacity: Number(v("--map-region-opacity")) || 0.38,
  };
}
