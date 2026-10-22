// 영상 장면용 고정밀 국경(개발 서버 ?scene 전용) - 사이트 국경(public/borders)은 원본을 20%로 단순화하고 0.01°로 반올림해
// 지형의 10m 해안과 어긋나(해안을 따라 나라 색이 없는 띠) 영상에는 원본 정밀도를 쓴다. 결과는 git 밖(RMW data/geo/borders/)에 둔다.
//
// 실행(RMW scripts/map-scene.mjs가 장면마다 한 번 부른다):
//   node scripts/scene-borders.mjs --raw <cliopatria_polities_only_*.geojson> --years 1223,1230 --bbox 30,43.5,41.75,51.75 --out <폴더>
//   → <폴더>/<연도>.geojson (FeatureCollection, properties: n 이름, w Wikidata, a 넓이 km²) - 사이트 국경과 같은 이름·색 열쇠
//
// 원본: Cliopatria (Seshat Global History Databank), CC BY 4.0 - 영상 설명란에 출처 표기 필수
//   https://github.com/Seshat-Global-History-Databank/cliopatria/raw/main/cliopatria.geojson.zip (약 46MB, 풀면 약 173MB)
// 원본 도형·연도 오류는 사이트와 같은 고치기(scripts/lib/polityFixes.mjs)를 그대로 쓴다. 그 해는 연말 기준(y + 0.99)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoArea, geoBounds } from "d3-geo";
import { applyRenames, applySnapshotFixes, rewind } from "./lib/polityFixes.mjs";

const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? undefined : process.argv[i + 1];
};
const rawPath = arg("raw");
const years = (arg("years") ?? "").split(",").filter(Boolean).map(Number);
const bbox = (arg("bbox") ?? "").split(",").map(Number);
const out = arg("out");
if (!rawPath || !years.length || bbox.length !== 4 || !out) {
  console.error(
    "사용: node scripts/scene-borders.mjs --raw <geojson> --years 1223[,1230] --bbox 서,남,동,북 --out <폴더>",
  );
  process.exit(1);
}
// 기울인 장면의 먼 쪽까지 보이므로 넉넉히(상자에 걸치는 나라는 자르지 않고 통째로)
const MARGIN = 12;
const [W, S, E, N] = [bbox[0] - MARGIN, bbox[1] - MARGIN, bbox[2] + MARGIN, bbox[3] + MARGIN];

const t0 = Date.now();
const features = JSON.parse(readFileSync(rawPath, "utf8")).features.filter(
  (f) => !f.properties.Type || f.properties.Type === "POLITY",
);
// 이름표 위치는 쓰지 않는다(장면은 글자 없음) - applyRenames가 같은 길이 목록을 원해서 빈 자리
applyRenames(features, features.map(() => ({ geometry: null })));
const wikidataOfName = new Map(features.map((f) => [f.properties.Name, f.properties.Wikidata]));

mkdirSync(out, { recursive: true });
for (const year of years) {
  const active = [];
  for (const f of features) {
    const p = f.properties;
    if (!f.geometry || p.FromYear > year || p.ToYear < year) continue;
    const geometry = rewind(f.geometry);
    if (!geometry) continue;
    const [[x0, y0], [x1, y1]] = geoBounds(geometry);
    // 날짜변경선을 넘는 도형(x0 > x1)은 그냥 넣는다
    if (x0 <= x1 && (x1 < W || x0 > E || y1 < S || y0 > N)) continue;
    active.push({
      type: "Feature",
      geometry,
      properties: { n: p.Name, w: p.Wikidata || undefined, a: Math.round(p.Area ?? 0) },
    });
  }
  await applySnapshotFixes(active, year + 0.99, (n) => wikidataOfName.get(n));
  for (const f of active)
    if (geoArea(f) > 2 * Math.PI) throw new Error(`${year}년 "${f.properties.n}" 도형이 뒤집힘`);
  const file = join(out, `${year}.geojson`);
  const json = JSON.stringify({ type: "FeatureCollection", features: active });
  writeFileSync(file, json);
  console.log(`${year}년 나라 ${active.length}개, ${(json.length / 1e6).toFixed(1)}MB → ${file}`);
}
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
