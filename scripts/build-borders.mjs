// 연도별 역사 국경 스냅샷 만들기
//
// 원본: Cliopatria (Seshat Global History Databank), CC BY 4.0
//   https://github.com/Seshat-Global-History-Databank/cliopatria
//
// 1) 원본 내려받기(최초 1회, 46MB):
//      mkdir -p data-raw/cliopatria && curl -L -o data-raw/cliopatria/cliopatria.geojson.zip \
//        https://github.com/Seshat-Global-History-Databank/cliopatria/raw/main/cliopatria.geojson.zip
//      (cd data-raw/cliopatria && unzip -o cliopatria.geojson.zip)
// 2) npm run borders
//
// 결과(public/borders/, git에 올림):
//   index.json          스냅샷 연도 목록
//   <연도>.json         그 연도에 존재한 정치체 영역(TopoJSON)
//   names/<언어>.json   정치체 이름(원본 영어) → 언어별 이름
//                       Wikidata에서 받고, content/polity-names/<언어>.txt에 적은 이름이 우선
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { topology } from "topojson-server";
import { feature, quantize } from "topojson-client";
import { geoArea } from "d3-geo";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const RAW_DIR = root("data-raw/cliopatria");
const SIMPLIFIED = root("data-raw/cliopatria/simplified.geojson");
const LABELS = root("data-raw/cliopatria/labels.geojson");
const NAME_CACHE = root("data-raw/cliopatria/wikidata-names.json");
const TITLE_CACHE = root("data-raw/cliopatria/wikipedia-qids.json");
const NAME_OVERRIDES_DIR = root("content/polity-names");
const OUT = root("public/borders");

const LOCALES = ["ko", "en", "zh", "es", "hi", "ar", "fr", "pt"];

/** 스냅샷 연도: 고대는 듬성듬성, 근현대는 촘촘하게 (timeScale.ts의 비선형 축과 비슷한 밀도) */
function snapshotYears() {
  const years = [];
  const add = (from, to, step) => {
    for (let y = from; y < to; y += step) years.push(y);
  };
  add(-3400, -1000, 100);
  add(-1000, 0, 50);
  add(0, 1000, 25);
  add(1000, 1500, 20);
  add(1500, 1800, 10);
  add(1800, 1900, 5);
  add(1900, 2025, 2);
  return years.map((y) => (y === 0 ? 1 : y)); // 0년은 없다
}

// 1) 단순화 + 라벨 위치 (mapshaper)
const raw = readdirSync(RAW_DIR).find((f) => /^cliopatria.*\.geojson$/.test(f));
if (!raw) {
  console.error(
    "원본이 없습니다. 스크립트 맨 위 주석의 내려받기 단계를 먼저 실행하세요.",
  );
  process.exit(1);
}
const mapshaper = root("node_modules/.bin/mapshaper");
if (!existsSync(SIMPLIFIED)) {
  console.log("단순화 중… (수십 초)");
  execFileSync(
    mapshaper,
    [
      "-i",
      `${RAW_DIR}/${raw}`,
      "-filter",
      "Type === 'POLITY'",
      "-filter-fields",
      "Name,FromYear,ToYear,Area,Wikidata,Wikipedia",
      "-simplify",
      "20%",
      "weighted",
      "keep-shapes",
      "-o",
      SIMPLIFIED,
      "format=geojson",
      "precision=0.01",
    ],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
    },
  );
}
if (!existsSync(LABELS)) {
  execFileSync(
    mapshaper,
    [
      "-i",
      SIMPLIFIED,
      "-points",
      "inner",
      "-o",
      LABELS,
      "format=geojson",
      "precision=0.01",
    ],
    {
      stdio: "inherit",
    },
  );
}

const features = JSON.parse(readFileSync(SIMPLIFIED, "utf8")).features;
const labels = JSON.parse(readFileSync(LABELS, "utf8")).features;
if (features.length !== labels.length)
  throw new Error("라벨 개수가 도형 개수와 다릅니다");

/**
 * d3-geo는 구면 기준이라 외곽 링이 시계 방향이어야 한다.
 * 방향이 반대면 "그 나라를 뺀 지구 전체"로 칠해지므로, 넓이가 반구(2π)보다 큰 링은 뒤집는다.
 */
function rewind(geometry) {
  const fixPolygon = (rings) =>
    rings.map((ring, i) => {
      const area = geoArea({ type: "Polygon", coordinates: [ring] });
      const inverted = area > 2 * Math.PI;
      // 외곽(i=0)은 작은 쪽, 구멍(i>0)은 큰 쪽이어야 한다
      return (i === 0) === inverted ? [...ring].reverse() : ring;
    });
  // 아주 작은 조각(약 40km² 미만)은 좌표 압축 때 찌그러져 방향이 뒤집힐 수 있어 뺀다
  // (실제 사례: 725~800년 Brythonic Kingdoms의 작은 섬이 뒤집혀 지도 전체가 칠해짐)
  const MIN_AREA = 1e-6; // 스테라디안
  const big = (rings) =>
    geoArea({ type: "Polygon", coordinates: [rings[0]] }) >= MIN_AREA;
  if (geometry.type === "Polygon") {
    const rings = fixPolygon(geometry.coordinates);
    return big(rings) ? { ...geometry, coordinates: rings } : null;
  }
  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates.map(fixPolygon).filter(big);
    return polygons.length ? { ...geometry, coordinates: polygons } : null;
  }
  return geometry;
}

// 2) 연도별 스냅샷
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/names`, { recursive: true });

const years = snapshotYears();
let totalBytes = 0;
for (const year of years) {
  const active = [];
  features.forEach((f, i) => {
    const p = f.properties;
    if (!f.geometry || p.FromYear > year || p.ToYear < year) return;
    const geometry = rewind(f.geometry);
    if (!geometry) return;
    const label = labels[i].geometry?.coordinates;
    active.push({
      type: "Feature",
      geometry,
      properties: {
        n: p.Name,
        w: p.Wikidata || undefined,
        a: Math.round(p.Area ?? 0),
        l: label
          ? [Math.round(label[0] * 10) / 10, Math.round(label[1] * 10) / 10]
          : undefined,
      },
    });
  });
  const topo = quantize(
    topology({ p: { type: "FeatureCollection", features: active } }),
    1e5,
  );
  // 압축 후에도 뒤집힌 도형(넓이 > 반구)이 남았는지 검사
  for (const p of feature(topo, topo.objects.p).features) {
    if (geoArea(p) > 2 * Math.PI)
      throw new Error(`${year}년 "${p.properties.n}" 도형이 뒤집힘`);
  }
  const json = JSON.stringify(topo);
  totalBytes += json.length;
  writeFileSync(`${OUT}/${year}.json`, json);
}
writeFileSync(`${OUT}/index.json`, JSON.stringify(years));
console.log(
  `스냅샷 ${years.length}개, 합계 ${(totalBytes / 1e6).toFixed(1)}MB → public/borders/`,
);

// 3) 언어별 이름 (결과는 data-raw에 캐시)
//    원본의 Wikidata ID는 틀린 경우가 많아서(예: Byzantine Empire → "비잔티움 제국의 대외 관계")
//    영어 위키백과 문서 제목(Wikipedia 필드) → Wikidata 항목 순서로 찾고, 없을 때만 Wikidata ID를 쓴다.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 요청 제한(429)이면 기다렸다가 다시 시도 */
async function fetchJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "ChronoMap/0.1 (https://github.com/FlutterNeverDie/chrono-map; oasa741@gmail.com)" },
    });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt >= 6)
      throw new Error(`요청 실패 ${res.status}: ${url}`);
    const wait =
      Number(res.headers.get("retry-after")) * 1000 || 5000 * attempt;
    process.stdout.write(`\n요청 제한, ${wait / 1000}초 후 재시도\n`);
    await sleep(wait);
  }
}
const readCache = (file) =>
  existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

// 3-1) 위키백과 문서 제목 → Wikidata ID (넘겨주기·표기 정규화 반영)
const titleCache = readCache(TITLE_CACHE);
const titles = [
  ...new Set(features.map((f) => f.properties.Wikipedia).filter(Boolean)),
];
const newTitles = titles.filter((t) => !(t in titleCache));
for (let i = 0; i < newTitles.length; i += 50) {
  const batch = newTitles.slice(i, i + 50);
  const { query } = await fetchJson(
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item" +
      `&titles=${encodeURIComponent(batch.join("|"))}`,
  );
  const resolve = new Map();
  for (const n of query?.normalized ?? []) resolve.set(n.from, n.to);
  for (const r of query?.redirects ?? []) resolve.set(r.from, r.to);
  const qidOf = new Map(
    Object.values(query?.pages ?? {}).map((p) => [
      p.title,
      p.pageprops?.wikibase_item,
    ]),
  );
  for (const t of batch) {
    let title = t;
    for (let k = 0; k < 3 && resolve.has(title); k++)
      title = resolve.get(title);
    titleCache[t] = qidOf.get(title) ?? null;
  }
  writeFileSync(TITLE_CACHE, JSON.stringify(titleCache));
  process.stdout.write(
    `\r위키백과 문서 ${Math.min(i + 50, newTitles.length)}/${newTitles.length}`,
  );
  await sleep(500);
}
if (newTitles.length) process.stdout.write("\n");

const qidOfFeature = (p) =>
  (p.Wikipedia && titleCache[p.Wikipedia]) || p.Wikidata || null;

// 3-2) Wikidata 항목 → 언어별 이름. 이름표(label)가 없으면 언어 변형(zh-hans, pt-br)과 그 언어 위키백과 문서 제목으로 채운다
const VARIANTS = {
  zh: ["zh-hans", "zh-cn", "zh-hant", "zh-tw"],
  pt: ["pt-br"],
};
const SITES = Object.fromEntries(LOCALES.map((l) => [l, `${l}wiki`]));
const labelCache = readCache(NAME_CACHE);
const qids = [
  ...new Set(features.map((f) => qidOfFeature(f.properties)).filter(Boolean)),
];
const newQids = qids.filter((q) => !(q in labelCache));
const languages = [...LOCALES, ...Object.values(VARIANTS).flat()];
for (let i = 0; i < newQids.length; i += 50) {
  const batch = newQids.slice(i, i + 50);
  const { entities } = await fetchJson(
    "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|sitelinks" +
      `&languages=${languages.join("|")}&sitefilter=${Object.values(SITES).join("|")}&ids=${batch.join("|")}`,
  );
  for (const q of batch) {
    const e = entities?.[q] ?? {};
    const names = {};
    for (const l of LOCALES) {
      const label = [l, ...(VARIANTS[l] ?? [])]
        .map((v) => e.labels?.[v]?.value)
        .find(Boolean);
      // 위키백과 제목의 괄호 설명 "(1115–1234)" 등은 뗀다
      const title = e.sitelinks?.[SITES[l]]?.title?.replace(
        /\s*\([^)]*\)\s*$/,
        "",
      );
      if (label || title) names[l] = label ?? title;
    }
    labelCache[q] = names;
  }
  writeFileSync(NAME_CACHE, JSON.stringify(labelCache));
  process.stdout.write(
    `\rWikidata 이름 ${Math.min(i + 50, newQids.length)}/${newQids.length}`,
  );
  await sleep(1000);
}
if (newQids.length) process.stdout.write("\n");

// 4) 사람이 고친 이름이 Wikidata보다 우선 (content/polity-names/<언어>.txt, 한 줄에 "원본 이름 = 번역")
const overrides = {};
for (const locale of LOCALES) {
  const file = `${NAME_OVERRIDES_DIR}/${locale}.txt`;
  if (!existsSync(file)) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((raw, i) => {
      const text = raw.trim();
      if (!text || text.startsWith("#")) return;
      const eq = text.indexOf(" = ");
      if (eq < 0)
        throw new Error(
          `content/polity-names/${locale}.txt:${i + 1} "원본 이름 = 번역" 형식이 아님: ${raw}`,
        );
      const name = text.slice(0, eq).trim();
      (overrides[name] ??= {})[locale] = text.slice(eq + 3).trim();
    });
}

// 이름표 열쇠는 원본 정치체 이름(Name). 여러 정치체가 한 위키 항목을 같이 쓰기도 해서(예: 북송·남송 → 송나라) ID를 열쇠로 쓰지 않는다.
const qidOfName = new Map();
for (const f of features) {
  const q = qidOfFeature(f.properties);
  if (q && !qidOfName.has(f.properties.Name))
    qidOfName.set(f.properties.Name, q);
}
for (const name of Object.keys(overrides)) {
  if (!features.some((f) => f.properties.Name === name)) {
    console.warn(`content/polity-names: 원본에 없는 정치체 이름 "${name}"`);
  }
}

for (const locale of LOCALES) {
  const names = {};
  for (const [name, q] of qidOfName)
    if (labelCache[q]?.[locale]) names[name] = labelCache[q][locale];
  // "(Habsburg Monarchy)"처럼 괄호로 감싼 이름(종속·부속 영역)은 괄호 밖 이름을 그대로 쓴다
  const allNames = new Set(features.map((f) => f.properties.Name));
  const fill = (name) => {
    const inner = name.match(/^\((.+)\)$/)?.[1];
    if (inner && !names[name] && names[inner]) names[name] = names[inner];
  };
  for (const [name, byLocale] of Object.entries(overrides))
    if (byLocale[locale]) names[name] = byLocale[locale];
  allNames.forEach(fill);
  writeFileSync(`${OUT}/names/${locale}.json`, JSON.stringify(names));
}
console.log(
  `이름 ${qidOfName.size}개 × ${LOCALES.length}개 언어 (수정 ${Object.keys(overrides).length}개) → public/borders/names/`,
);
