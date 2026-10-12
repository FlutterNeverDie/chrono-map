// 전쟁 지도용 국경 → public/campaigns/<id>/borders/<연도>.json
// 원본: Cliopatria(Seshat, CC BY 4.0). 먼저 npm run borders로 data-raw/cliopatria/simplified.geojson이 있어야 한다.
// 전쟁 지역(search 범위 + 여유)에 걸치는 나라만 담아 파일을 작게 한다.
//
//   npm run wars:borders              모든 전쟁
//   npm run wars:borders -- crusades  특정 전쟁만
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { geoArea, geoBounds } from "d3-geo";
import { topology } from "topojson-server";
import { feature, quantize } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import { root } from "../lib/content";
import { listCampaigns, readTheme } from "./lib";

const RAW = root("data-raw/cliopatria");
type Props = { Name: string; FromYear: number; ToYear: number; Area: number };
const shapes = JSON.parse(readFileSync(`${RAW}/simplified.geojson`, "utf8")).features as Feature<Geometry, Props>[];
const labels = JSON.parse(readFileSync(`${RAW}/labels.geojson`, "utf8")).features as Feature<Geometry, unknown>[];

/** d3 구면 기준 외곽 링 방향 맞추기 + 아주 작은 조각 제거 (build-borders.mjs와 같은 규칙) */
function rewind(g: Geometry): Polygon | MultiPolygon | null {
  const fix = (rings: Position[][]) =>
    rings.map((ring, i) => {
      const inverted = geoArea({ type: "Polygon", coordinates: [ring] }) > 2 * Math.PI;
      return (i === 0) === inverted ? [...ring].reverse() : ring;
    });
  const big = (rings: Position[][]) => geoArea({ type: "Polygon", coordinates: [rings[0]] }) >= 1e-6;
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

/** 경계 상자가 겹치는가 (날짜변경선을 넘는 상자는 넉넉히 통과) */
function overlaps(bounds: [[number, number], [number, number]], s: { west: number; east: number; south: number; north: number }) {
  const [[w, so], [e, n]] = bounds;
  if (n < s.south || so > s.north) return false;
  if (w > e) return true;
  return !(e < s.west || w > s.east);
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
for (const id of args.length ? args : listCampaigns()) {
  const t = readTheme(id);
  const pad = 15;
  const area = {
    west: t.search.west - pad,
    east: t.search.east + pad,
    south: t.search.south - pad,
    north: t.search.north + pad,
  };
  const out = root(`public/campaigns/${id}/borders`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const years: number[] = [];
  for (let y = t.startYear; y <= t.endYear; y += t.bordersStep) years.push(y === 0 ? 1 : y);
  if (years.at(-1) !== t.endYear) years.push(t.endYear);

  let bytes = 0;
  for (const year of years) {
    const active: Feature[] = [];
    shapes.forEach((f, i) => {
      const p = f.properties;
      if (!f.geometry || p.FromYear > year || p.ToYear < year) return;
      const geometry = rewind(f.geometry);
      if (!geometry || !overlaps(geoBounds(geometry), area)) return;
      const l = labels[i].geometry as { coordinates?: [number, number] } | null;
      active.push({
        type: "Feature",
        geometry,
        properties: {
          n: p.Name,
          a: Math.round(p.Area ?? 0),
          l: l?.coordinates ? l.coordinates.map((v) => Math.round(v * 10) / 10) : undefined,
        },
      });
    });
    const collection: FeatureCollection = { type: "FeatureCollection", features: active };
    // topojson-server와 topojson-client의 타입 정의가 서로 맞지 않아 이 구간만 느슨하게 둔다
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const topo: any = quantize(topology({ p: collection } as any) as any, 1e5);
    const decoded = feature(topo, topo.objects.p) as unknown as FeatureCollection;
    /* eslint-enable @typescript-eslint/no-explicit-any */
    for (const f of decoded.features)
      if (geoArea(f) > 2 * Math.PI) throw new Error(`${id} ${year}: 뒤집힌 도형 "${f.properties?.n}"`);
    const json = JSON.stringify(topo);
    bytes += json.length;
    writeFileSync(`${out}/${year}.json`, json);
  }
  console.log(`  ${id}: 국경 ${years.length}개 연도, ${(bytes / 1e6).toFixed(1)}MB`);
}
