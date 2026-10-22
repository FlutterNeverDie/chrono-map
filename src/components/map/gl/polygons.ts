import earcut from "earcut";
import { geoPath, type GeoProjection } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";

/**
 * 도형(경위도) → 지도 좌표 고리·삼각형. WebGL 지도가 받은 국경을 그릴 수 있게 브라우저에서 쓰고,
 * 검사(scripts/dev/mesh-check.ts)도 같은 코드를 쓴다.
 * 투영·자르기는 d3 그대로(SVG 지도와 같은 모양) - geoPath가 그리는 점을 받아 고리로 모은다.
 */
export type Ring = [number, number][];
export type Shape = {
  /** 바깥 고리 뒤에 그 구멍들 */
  rings: Ring[];
  holes: boolean[];
  /** 삼각형(고리들을 이어 붙인 정점 번호) */
  tris: number[];
};

/** 다각형(경위도, d3 감김 규칙) → 지도 좌표 고리들(날짜변경선·지도 끝에서 잘라 닫은 그대로 - 삼각형 없이 고리만 필요할 때) */
export function projectPolygon(
  projection: GeoProjection,
  coordinates: Polygon["coordinates"],
): Ring[] {
  const rings: Ring[] = [];
  let cur: Ring = [];
  const ctx = {
    moveTo(x: number, y: number) {
      if (cur.length > 2) rings.push(cur);
      cur = [[x, y]];
    },
    lineTo(x: number, y: number) {
      cur.push([x, y]);
    },
    closePath() {
      if (cur.length > 2) rings.push(cur);
      cur = [];
    },
    arc() {},
  };
  geoPath(
    projection,
    ctx as unknown as CanvasRenderingContext2D,
  )({ type: "Polygon", coordinates });
  if (cur.length > 2) rings.push(cur);
  return rings;
}

export function signedArea(r: Ring): number {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return s / 2;
}
function inside([x, y]: [number, number], r: Ring): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      c = !c;
  }
  return c;
}

/** 고리들 → 바깥 고리마다 구멍을 붙여 삼각형으로(가장 큰 고리의 방향이 바깥) */
export function triangulate(rings: Ring[], holes?: boolean[]): Shape {
  if (!rings.length) return { rings, holes: [], tris: [] };
  let groups: [number, number[]][];
  if (holes) {
    // 이미 바깥·구멍이 정해짐(받은 자료): 바깥 뒤에 오는 구멍들이 그 바깥의 것
    groups = [];
    rings.forEach((_, i) => {
      if (!holes[i] || !groups.length) groups.push([i, []]);
      else groups[groups.length - 1][1].push(i);
    });
  } else {
    const areas = rings.map(signedArea);
    const abs = areas.map(Math.abs);
    const outerSign = Math.sign(areas[abs.indexOf(Math.max(...abs))]);
    const outers = rings
      .map((_, i) => i)
      .filter((i) => Math.sign(areas[i]) === outerSign);
    const map = new Map(outers.map((o) => [o, [] as number[]]));
    rings.forEach((r, i) => {
      if (Math.sign(areas[i]) === outerSign) return;
      const o = outers.find((o) => inside(r[0], rings[o]));
      if (o !== undefined) map.get(o)!.push(i);
    });
    groups = [...map];
  }
  const out: Shape = { rings: [], holes: [], tris: [] };
  let base = 0;
  for (const [o, hs] of groups) {
    const flat: number[] = [];
    const holeIdx: number[] = [];
    for (const k of [o, ...hs]) {
      if (k !== o) holeIdx.push(flat.length / 2);
      for (const p of rings[k]) flat.push(p[0], p[1]);
      out.rings.push(rings[k]);
      out.holes.push(k !== o);
    }
    for (const i of earcut(flat, holeIdx)) out.tris.push(base + i);
    base += flat.length / 2;
  }
  return out;
}

/** GeoJSON 도형 하나 → 고리·삼각형(지도 좌표) */
export function shapeOf(
  projection: GeoProjection,
  f: Feature<Polygon | MultiPolygon>,
): Shape {
  const polys =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates]
      : f.geometry.coordinates;
  const out: Shape = { rings: [], holes: [], tris: [] };
  for (const p of polys) {
    const t = triangulate(projectPolygon(projection, p));
    const base = out.rings.reduce((s, r) => s + r.length, 0);
    out.rings.push(...t.rings);
    out.holes.push(...t.holes);
    for (const i of t.tris) out.tris.push(base + i);
  }
  return out;
}

/** 선 도형(경위선 등) → 지도 좌표 꺾은선들(d3가 자른 그대로) */
export function projectLines(
  projection: GeoProjection,
  geometry: GeoJSON.Geometry,
): Ring[] {
  const lines: Ring[] = [];
  let cur: Ring = [];
  const ctx = {
    moveTo(x: number, y: number) {
      if (cur.length > 1) lines.push(cur);
      cur = [[x, y]];
    },
    lineTo(x: number, y: number) {
      cur.push([x, y]);
    },
    closePath() {
      if (cur.length > 1) lines.push([...cur, cur[0]]);
      cur = [];
    },
    arc() {},
  };
  geoPath(projection, ctx as unknown as CanvasRenderingContext2D)(geometry);
  if (cur.length > 1) lines.push(cur);
  return lines;
}
