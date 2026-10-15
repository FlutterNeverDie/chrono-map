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
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { root } from "../lib/content";
import { applyRenames, applySnapshotFixes, labelHidden, rewind, roundPoint } from "../lib/polityFixes.mjs";
import { listCampaigns, readTheme } from "./lib";

const RAW = root("data-raw/cliopatria");
type Props = { Name: string; FromYear: number; ToYear: number; Area: number };
const shapes = JSON.parse(readFileSync(`${RAW}/simplified.geojson`, "utf8")).features as Feature<Geometry, Props>[];
const labels = JSON.parse(readFileSync(`${RAW}/labels.geojson`, "utf8")).features as Feature<Geometry, unknown>[];
// 원본 도형·연도 오류 바로잡기 — 본 지도(build-borders.mjs)와 같은 규칙: 이름 바꾸기(Great Britain → United Kingdom 1801~ 등),
// 독립한 땅 떼어 내기(알제리·오만 …), 이름표 위치 고정·빼기
applyRenames(shapes, labels);

/** 경계 상자가 겹치는가 (날짜변경선을 넘는 상자는 넉넉히 통과) */
function overlaps(bounds: [[number, number], [number, number]], s: { west: number; east: number; south: number; north: number }) {
  const [[w, so], [e, n]] = bounds;
  if (n < s.south || so > s.north) return false;
  if (w > e) return true;
  return !(e < s.west || w > s.east);
}

// tsx는 이 파일을 CommonJS로 돌려 최상위 await를 쓸 수 없다
async function main() {
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

    // 전쟁이 끝나는 순간(소수 연도): month면 끝 달의 말, year면 끝 해의 말
    const endsAt = t.unit === "month" ? (t.end + 1) / 12 - 0.001 : t.endYear + 0.99;
    let bytes = 0;
    for (const [k, year] of years.entries()) {
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
            l: l?.coordinates && !labelHidden(p.Name, year) ? roundPoint(l.coordinates) : undefined,
          },
        });
      });
      // 이 스냅샷이 화면에 쓰이는 마지막 시점 기준으로 고친다
      // (예: 알제리 전쟁은 1962-03에 끝나므로 1962년 스냅샷도 프랑스령 알제리, 독립 1962-07)
      const shownUntil = Math.min((years[k + 1] ?? Infinity) - 0.01, endsAt);
      await applySnapshotFixes(active, shownUntil);
      // 떼어 내 새로 생긴 나라는 전쟁 지역 밖일 수 있다
      for (let i = active.length - 1; i >= 0; i--)
        if (!overlaps(geoBounds(active[i]), area)) active.splice(i, 1);
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
