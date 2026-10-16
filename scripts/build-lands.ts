// 상세 페이지 자리를 다스린 나라의 차례: public/borders(연도별 국경 스냅샷)
//   + 사건(content.json)·전쟁(campaigns.json)·주제 지도 항목(topics.json)의 좌표
//   → src/data/generated/lands.json ("이 땅을 다스린 나라", 네트워크 없음, dev/build 전에 자동)
// npm run content·wars:build·topics:build 뒤에 돈다. 열쇠는 상세 페이지 경로(event/<id>, wars/<id>, maps/<지도>/<항목>)
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Content } from "../src/lib/types";
import { LOCALES } from "../src/i18n/locales";
import { root } from "./lib/content";

type Props = { n: string; a: number };
type Box = [[number, number], [number, number]];
type Ring = number[][];
// 다각형(섬 하나)마다 상자를 따로 둔다 - 섬이 수백 개인 제국도 점 근처 다각형만 짝홀 검사
type Shape = { n: string; a: number; box: Box; polys: { rings: Ring[]; box: Box }[] };
// 형식은 src/data/lands.ts의 LandRun
type LandRun = { n: string; from: number; to: number | null };

const BORDERS = root("public/borders");
const readGenerated = <T>(name: string) => JSON.parse(readFileSync(root(`src/data/generated/${name}`), "utf8")) as T;
const { events } = readGenerated<Content>("content.json");
type Coords = [number, number];
const campaigns = readGenerated<{ id: string; view: { lon: number; lat: number }; battles: { coords: Coords; links: number }[] }[]>(
  "campaigns.json",
);
const topics = readGenerated<{ id: string; items: { id: string; coords: Coords }[] }[]>("topics.json");
// 전쟁 자리 = 가장 중요한(언어판이 많은) 전투의 자리, 전투가 없으면 처음 화면 가운데
const places: { key: string; coords: Coords }[] = [
  ...events.map((e) => ({ key: `event/${e.id}`, coords: e.coords })),
  ...campaigns.map((c) => ({
    key: `wars/${c.id}`,
    coords: [...c.battles].sort((a, b) => b.links - a.links)[0]?.coords ?? ([c.view.lon, c.view.lat] as Coords),
  })),
  ...topics.flatMap((t) => t.items.map((i) => ({ key: `maps/${t.id}/${i.id}`, coords: i.coords }))),
];
const years = JSON.parse(readFileSync(`${BORDERS}/index.json`, "utf8")) as number[];

// 입력(이 스크립트·자리 좌표·국경 파일)이 지난번과 같으면 다시 계산하지 않는다(약 6초 → dev를 켤 때마다 기다리지 않게)
const OUT = root("src/data/generated/lands.json");
const STAMP = root("src/data/generated/lands.stamp");
const borderFiles = [...readdirSync(BORDERS), ...readdirSync(`${BORDERS}/names`).map((f) => `names/${f}`)].sort();
const stamp = createHash("sha1")
  .update(readFileSync(new URL(import.meta.url)))
  .update(JSON.stringify(places))
  .update(borderFiles.map((f) => `${f}:${statSync(`${BORDERS}/${f}`).size}:${statSync(`${BORDERS}/${f}`).mtimeMs}`).join("\n"))
  .digest("hex");
if (existsSync(OUT) && existsSync(STAMP) && readFileSync(STAMP, "utf8") === stamp) {
  console.log("이 땅을 다스린 나라: 입력이 그대로라 건너뜀(src/data/generated/lands.json)");
  process.exit(0);
}

// 바다 위 사건(해전·작은 섬 등)은 둘레를 조금씩 넓혀 가며 가장 가까운 땅을 찾는다(약 30km ~ 220km. 더 넓히면 바다 건너 엉뚱한 나라가 잡힌다)
const RINGS = [0, 0.25, 0.5, 1, 2].flatMap((r) =>
  r === 0 ? [[0, 0]] : Array.from({ length: 8 }, (_, k) => [r * Math.cos((k * Math.PI) / 4), r * Math.sin((k * Math.PI) / 4)]),
);

const inBox = ([x, y]: number[], [[x0, y0], [x1, y1]]: Box) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

/** 경위도 평면에서 점이 다각형 안인지(짝홀 규칙, 구멍 포함). d3 geoContains(구면)보다 수십 배 빠르고, 나라 하나 크기에서는 결과가 같다 */
function contains(rings: Ring[], [x, y]: number[]): boolean {
  let inside = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
}

function boxOf(points: number[][]): Box {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return [[x0, y0], [x1, y1]];
}

function shapeOf({ geometry: g, properties: { n, a } }: Feature<Polygon | MultiPolygon, Props>): Shape {
  const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map((rings) => ({ rings, box: boxOf(rings[0]) }));
  return { n, a, box: boxOf(polys.flatMap((q) => q.box)), polys };
}

/**
 * 그 자리의 나라: 겹친 층 중 괄호 없는 이름("(British Empire)" 같은 상위 제국보다 실제 다스린 나라), 그중 가장 좁은 것
 */
function polityAt(shapes: Shape[], [lon, lat]: [number, number]): string | null {
  for (const [dx, dy] of RINGS) {
    const p = [lon + dx, lat + dy];
    const hits = shapes.filter((s) => inBox(p, s.box) && s.polys.some((q) => inBox(p, q.box) && contains(q.rings, p)));
    if (!hits.length) continue;
    hits.sort((a, b) => Number(a.n.startsWith("(")) - Number(b.n.startsWith("(")) || a.a - b.a);
    return hits[0].n;
  }
  return null;
}

const runs: Record<string, LandRun[]> = Object.fromEntries(places.map((p) => [p.key, []]));
for (const year of years) {
  const t = JSON.parse(readFileSync(`${BORDERS}/${year}.json`, "utf8")) as Topology<{ p: GeometryCollection<Props> }>;
  const shapes = (feature(t, t.objects.p).features as Feature<Polygon | MultiPolygon, Props>[])
    .filter((f) => geoArea(f) < 2 * Math.PI) // 뒤집힌 도형은 지구 전체를 덮는다(화면과 같은 검사)
    .map(shapeOf);
  for (const place of places) {
    const n = polityAt(shapes, place.coords);
    const list = runs[place.key];
    const last = list.at(-1);
    if (last?.n === n && last.to === null) continue;
    if (last && last.to === null) last.to = prevYear(year);
    if (n) list.push({ n, from: year, to: null });
  }
}

function prevYear(year: number) {
  return years[years.indexOf(year) - 1];
}

// 화면이 쓰는 이름만 언어별로(public/borders/names, 없으면 영어 → 원본 이름)
const used = new Set(Object.values(runs).flatMap((l) => l.map((r) => r.n)));
const allNames = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(`${BORDERS}/names/${l}.json`, "utf8")) as Record<string, string>]),
);
const names = Object.fromEntries(
  LOCALES.map((l) => [l, Object.fromEntries([...used].map((n) => [n, allNames[l][n] || allNames.en[n] || n]))]),
);

writeFileSync(OUT, JSON.stringify({ runs, names }));
writeFileSync(STAMP, stamp);
const avg = Object.values(runs).reduce((s, l) => s + l.length, 0) / places.length;
console.log(`상세 페이지 ${places.length}곳 자리의 나라 차례(평균 ${avg.toFixed(1)}개) → src/data/generated/lands.json`);
