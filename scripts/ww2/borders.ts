// 2차대전 지도용 연도별 국경 (1937~1945) → public/ww2/borders/<연도>.json
// 원본: Cliopatria(Seshat, CC BY 4.0). 먼저 npm run borders로 data-raw/cliopatria/simplified.geojson이 있어야 한다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { geoArea } from "d3-geo";
import { topology } from "topojson-server";
import { feature, quantize } from "topojson-client";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import { root } from "../lib/content";

const RAW = root("data-raw/cliopatria");
const OUT = root("public/ww2/borders");
const YEARS = [1937, 1938, 1939, 1940, 1941, 1942, 1943, 1944, 1945];

type Props = { Name: string; FromYear: number; ToYear: number; Area: number };
const shapes = JSON.parse(readFileSync(`${RAW}/simplified.geojson`, "utf8"))
  .features as Feature<Geometry, Props>[];
const labels = JSON.parse(readFileSync(`${RAW}/labels.geojson`, "utf8"))
  .features as Feature<Geometry, unknown>[];

/** d3 구면 기준 외곽 링 방향 맞추기 + 아주 작은 조각 제거 (build-borders.mjs와 같은 규칙) */
function rewind(g: Geometry): Polygon | MultiPolygon | null {
  const fix = (rings: Position[][]) =>
    rings.map((ring, i) => {
      const inverted =
        geoArea({ type: "Polygon", coordinates: [ring] }) > 2 * Math.PI;
      return (i === 0) === inverted ? [...ring].reverse() : ring;
    });
  const big = (rings: Position[][]) =>
    geoArea({ type: "Polygon", coordinates: [rings[0]] }) >= 1e-6;
  if (g.type === "Polygon") {
    const rings = fix(g.coordinates);
    return big(rings) ? { type: "Polygon", coordinates: rings } : null;
  }
  if (g.type === "MultiPolygon") {
    const polys = g.coordinates.map(fix).filter(big);
    return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
  }
  return null;
}

mkdirSync(OUT, { recursive: true });
for (const year of YEARS) {
  const active: Feature[] = [];
  shapes.forEach((f, i) => {
    const p = f.properties;
    if (!f.geometry || p.FromYear > year || p.ToYear < year) return;
    const geometry = rewind(f.geometry);
    if (!geometry) return;
    const l = labels[i].geometry as { coordinates?: [number, number] } | null;
    active.push({
      type: "Feature",
      geometry,
      properties: {
        n: p.Name,
        a: Math.round(p.Area ?? 0),
        l: l?.coordinates
          ? l.coordinates.map((v) => Math.round(v * 10) / 10)
          : undefined,
      },
    });
  });
  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: active,
  };
  // topojson-server와 topojson-client의 타입 정의가 서로 맞지 않아 이 구간만 느슨하게 둔다
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const topo: any = quantize(topology({ p: collection } as any) as any, 1e5);
  const decoded = feature(topo, topo.objects.p) as unknown as FeatureCollection;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  for (const f of decoded.features) {
    if (geoArea(f) > 2 * Math.PI) throw new Error(`${year} 뒤집힌 도형`);
  }
  writeFileSync(`${OUT}/${year}.json`, JSON.stringify(topo));
}
console.log(`2차대전 국경 ${YEARS.length}개 연도 → public/ww2/borders/`);
