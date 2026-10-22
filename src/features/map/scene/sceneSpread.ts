import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { Shape } from "@/components/map/gl/polygons";
import { glProjection, shapeAll } from "@/components/map/gl/shapes";
import { loadJson, loadPolities, polityColor } from "@/components/map";
import { snapshotFor, type Polity } from "../borders";
import { clamp01, ease, type LonLat, type Scene } from "./sceneData";
import { toHalf } from "./sceneHeight";

/**
 * 영역 번지기(장면 `spread`) 준비: 키 연도마다 그 나라 영역(삼각형)을 받고, 키 구간마다 "앞 영역에서의 거리" 격자를 만든다.
 * 그릴 때(sceneRenderer)는 다음 영역을 이 거리가 문턱보다 가까운 곳만 칠하고 문턱을 t에 따라 넓힌다 - 앞 영역 가장자리에서
 * 물감처럼 번져 나간다. 거리는 0(앞 영역) ~ 1(다음 영역에서 가장 먼 곳)로 맞춰 둔다. 같은 입력이면 같은 격자(무작위 없음)
 */

/** 거리 격자: 지도 좌표 상자 [x0, y0, x1, y1]에 w×h 칸, 값은 half float(0 ~ 1, 다음 영역 밖은 더 큼) */
export type SpreadField = {
  box: [number, number, number, number];
  w: number;
  h: number;
  data: Uint16Array;
};
export type SpreadSegment = {
  t0: number;
  t1: number;
  /** 앞 영역(없으면 from에서 시작) */
  from: Shape | null;
  to: Shape;
  field: SpreadField;
};
export type SpreadItem = {
  color: number[];
  rough: number;
  /** 첫 키 시각(이때부터 그 나라는 장면 국경 대신 이것으로) */
  start: number;
  /** 마지막 키 영역(그 뒤로 그대로) */
  last: Shape;
  segments: SpreadSegment[];
  names: string[];
};

/** 그 연도의 국경(장면 고정밀 국경 주소가 있으면 그것, 없으면 사이트 스냅샷) */
export async function bordersOf(
  year: number,
  urls: Record<string, string> | null,
): Promise<Polity[]> {
  const url = urls?.[String(year)];
  if (url) {
    const fc = await loadJson<{ features: Polity[] }>(url);
    return fc.features;
  }
  const years = await loadJson<number[]>("/borders/index.json");
  return loadPolities(`/borders/${snapshotFor(years, year)}.json`);
}

const shapesOf = (list: Feature<Polygon | MultiPolygon>[]) =>
  new Promise<Shape[]>((res) => shapeAll(list, res));

/** 여러 도형을 하나로(고리·삼각형을 이어 붙임) */
export function mergeShapes(list: Shape[]): Shape {
  const out: Shape = { rings: [], holes: [], tris: [] };
  for (const s of list) {
    const base = out.rings.reduce((n, r) => n + r.length, 0);
    out.rings.push(...s.rings);
    out.holes.push(...s.holes);
    for (const i of s.tris) out.tris.push(base + i);
  }
  return out;
}

/** 도형의 지도 좌표 범위 */
function boundsOf(s: Shape): [number, number, number, number] {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of s.rings)
    for (const [x, y] of r) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return [x0, y0, x1, y1];
}

/** 삼각형을 격자에 칠한다(칸 가운데가 안에 들면 1) */
function rasterize(
  s: Shape,
  box: [number, number, number, number],
  w: number,
  h: number,
): Uint8Array {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const sx = w / (box[2] - box[0]);
  const sy = h / (box[3] - box[1]);
  const pts = s.rings.flat();
  g.fillStyle = "#fff";
  g.beginPath();
  for (let i = 0; i < s.tris.length; i += 3) {
    const [a, b, d] = [pts[s.tris[i]], pts[s.tris[i + 1]], pts[s.tris[i + 2]]];
    g.moveTo((a[0] - box[0]) * sx, (a[1] - box[1]) * sy);
    g.lineTo((b[0] - box[0]) * sx, (b[1] - box[1]) * sy);
    g.lineTo((d[0] - box[0]) * sx, (d[1] - box[1]) * sy);
    g.closePath();
  }
  // 삼각형끼리 맞닿은 변에 틈이 남지 않게 nonzero(삼각형 방향이 섞여도 안쪽)
  g.fill("nonzero");
  const px = g.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}

/** 씨앗이 없는 칸의 처음 값(무한대 대신 아주 큰 수 - 식이 그대로 맞다) */
const FAR = 1e20;

/** 1차원 제곱 거리 변환(Felzenszwalb·Huttenlocher) - f를 제자리에서 */
function edt1(f: Float64Array, n: number, v: Int32Array, z: Float64Array, d: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
  for (let q = 0; q < n; q++) f[q] = d[q];
}

/** 씨앗(1)까지의 거리(칸) - 2차원 정확한 유클리드 거리 */
function distance(seed: Uint8Array, w: number, h: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = seed[i] ? 0 : FAR;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    edt1(f, h, v, z, d);
    for (let y = 0; y < h; y++) g[y * w + x] = f[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    edt1(f, w, v, z, d);
    for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(f[x]);
  }
  return g;
}

/** 긴 변 칸 수 - 지도 거리에서 앞쪽 굴곡보다 촘촘하면 된다(값은 그릴 때 이웃끼리 이어 매끈) */
const GRID = 768;

/** 앞 영역(또는 시작점)에서의 거리 격자(다음 영역에서 가장 먼 곳 = 1) */
function fieldOf(from: Shape | null, origin: LonLat | undefined, to: Shape): SpreadField {
  const b = boundsOf(to);
  if (from) {
    const a = boundsOf(from);
    b[0] = Math.min(b[0], a[0]);
    b[1] = Math.min(b[1], a[1]);
    b[2] = Math.max(b[2], a[2]);
    b[3] = Math.max(b[3], a[3]);
  }
  // 가장자리 칸이 잘리지 않게 조금 넓힌다
  const pad = Math.max(b[2] - b[0], b[3] - b[1]) * 0.02;
  const box: [number, number, number, number] = [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
  const aspect = (box[2] - box[0]) / (box[3] - box[1]);
  const w = Math.max(8, Math.round(aspect >= 1 ? GRID : GRID * aspect));
  const h = Math.max(8, Math.round(aspect >= 1 ? GRID / aspect : GRID));
  let seed: Uint8Array;
  if (from) seed = rasterize(from, box, w, h);
  else {
    if (!origin) throw new Error("장면 spread: 첫 키 연도에 영역이 없으면 from이 필요하다");
    const p = glProjection(origin)!;
    seed = new Uint8Array(w * h);
    const x = Math.round(((p[0] - box[0]) / (box[2] - box[0])) * w);
    const y = Math.round(((p[1] - box[1]) / (box[3] - box[1])) * h);
    seed[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))] = 1;
  }
  const dist = distance(seed, w, h);
  const inTo = rasterize(to, box, w, h);
  let max = 1e-6;
  for (let i = 0; i < dist.length; i++) if (inTo[i] && dist[i] < 1e9) max = Math.max(max, dist[i]);
  const data = new Uint16Array(w * h);
  for (let i = 0; i < data.length; i++) data[i] = toHalf(Math.min(4, dist[i] / max));
  return { box, w, h, data };
}

/** 장면의 spread 항목을 모두 준비한다(연도 국경 받기 → 삼각형 → 거리 격자) */
export async function prepareSpread(
  scene: Scene,
  urls: Record<string, string> | null,
  film: (c: number[]) => number[],
  css: (c: string) => number[],
): Promise<SpreadItem[]> {
  const out: SpreadItem[] = [];
  for (const sp of scene.spread ?? []) {
    const names = typeof sp.polity === "string" ? [sp.polity] : sp.polity;
    const keys = [...sp.keys].sort((a, b) => a.t - b.t);
    if (!keys.length) continue;
    let color: number[] | null = sp.color ? css(sp.color) : null;
    const shapes: (Shape | null)[] = [];
    for (const k of keys) {
      const feats = (await bordersOf(k.year, urls)).filter((p) => names.includes(p.properties.n));
      if (!color && feats.length) color = css(polityColor(feats[0].properties.w ?? feats[0].properties.n));
      shapes.push(feats.length ? mergeShapes(await shapesOf(feats)) : null);
    }
    const last = shapes[shapes.length - 1];
    if (!last) throw new Error(`장면 spread: ${keys.at(-1)!.year}년 국경에 "${names.join(", ")}"가 없다`);
    const segments: SpreadSegment[] = [];
    for (let i = 0; i < keys.length - 1; i++) {
      const to = shapes[i + 1];
      if (!to) throw new Error(`장면 spread: ${keys[i + 1].year}년 국경에 "${names.join(", ")}"가 없다`);
      segments.push({
        t0: keys[i].t,
        t1: keys[i + 1].t,
        from: shapes[i],
        to,
        field: fieldOf(shapes[i], sp.from, to),
      });
    }
    out.push({
      color: film(color ?? [0.5, 0.4, 0.3, 1]),
      rough: sp.rough ?? 1,
      start: keys[0].t,
      last,
      segments,
      names,
    });
  }
  return out;
}

/** 그 시각에 그릴 것: 구간이면 앞 영역(사라지는 곳은 서서히) + 다음 영역(문턱 r까지), 마지막 키 뒤면 마지막 영역 전체 */
export type SpreadNow =
  | { kind: "grow"; seg: SpreadSegment; r: number; fade: number; boost: number }
  | { kind: "full"; shape: Shape };
export function spreadAt(item: SpreadItem, t: number): SpreadNow | null {
  if (t < item.start) return null;
  for (const [i, seg] of item.segments.entries())
    if (t <= seg.t1) {
      const lin = clamp01((t - seg.t0) / (seg.t1 - seg.t0 || 1e-6));
      const u = ease(lin, "inOut");
      return {
        kind: "grow",
        seg,
        r: u,
        // 앞 영역 중 다음 영역 밖(잃은 땅)은 끝 무렵 서서히 사라진다
        fade: 1 - clamp01((u - 0.75) / 0.25),
        // 첫 구간 처음 15%는 보통 나라 진하기에서 진하게 넘어간다
        boost: i === 0 ? clamp01(lin / 0.15) : 1,
      };
    }
  return { kind: "full", shape: item.last };
}
