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
//                       원본이 엉뚱한 위키 문서에 이어진 것은 content/polity-names/wikipedia.txt에서 문서를 바꿔 준다(8개 언어 한 번에)
// 원본 도형·연도 오류(독립한 나라가 옛 본국에 붙어 있는 것 등)는 scripts/lib/polityFixes.mjs의 POLITY_FIXES에서 고친다
// (전쟁 지도 scripts/campaigns/borders.ts도 같은 것을 쓴다)
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
import {
  applyRenames,
  applySnapshotFixes,
  extraPolities,
  labelHidden,
  rewind,
  roundPoint,
} from "./lib/polityFixes.mjs";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const RAW_DIR = root("data-raw/cliopatria");
const SIMPLIFIED = root("data-raw/cliopatria/simplified.geojson");
const LABELS = root("data-raw/cliopatria/labels.geojson");
const NAME_CACHE = root("data-raw/cliopatria/wikidata-names.json");
const TITLE_CACHE = root("data-raw/cliopatria/wikipedia-qids.json");
const NAME_OVERRIDES_DIR = root("content/polity-names");
const TITLE_OVERRIDES = root("content/polity-names/wikipedia.txt");
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

// 원본 도형·연도 오류 바로잡기(전쟁 지도와 같이 씀): scripts/lib/polityFixes.mjs
applyRenames(features, labels);
const wikidataOfName = new Map(
  features.map((f) => [f.properties.Name, f.properties.Wikidata]),
);

// 2) 연도별 스냅샷
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/names`, { recursive: true });

const years = snapshotYears();
let totalBytes = 0;
for (const [k, year] of years.entries()) {
  const active = [];
  features.forEach((f, i) => {
    const p = f.properties;
    if (!f.geometry || p.FromYear > year || p.ToYear < year) return;
    const geometry = rewind(f.geometry);
    if (!geometry) return;
    const label = labelHidden(p.Name, year)
      ? undefined
      : labels[i].geometry?.coordinates;
    active.push({
      type: "Feature",
      geometry,
      properties: {
        n: p.Name,
        w: p.Wikidata || undefined,
        a: Math.round(p.Area ?? 0),
        l: label ? roundPoint(label) : undefined,
      },
    });
  });
  // 스냅샷 y는 화면에서 다음 스냅샷 전까지(1900년 이후 2년, 그 전 5~100년)를 대표한다 → 그 기간의 마지막 시점 기준으로 고친다.
  // 전쟁 지도(scripts/campaigns/borders.ts)도 "그 스냅샷이 화면에 쓰이는 마지막 시점" 기준이라 두 지도의 결과가 같다
  const shownUntil = (years[k + 1] ?? year + 1) - 0.01;
  await applySnapshotFixes(active, shownUntil, (n) => wikidataOfName.get(n));
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
//    이름을 찾을 정치체: 원본 도형 + 고치기(POLITY_FIXES)로 새로 생기는 나라(원본에 없는 이름)
const polities = [
  ...features.map((f) => f.properties),
  ...[...extraPolities()].map(([Name, Wikipedia]) => ({ Name, Wikipedia })),
];
//    원본의 Wikidata ID는 틀린 경우가 많아서(예: Byzantine Empire → "비잔티움 제국의 대외 관계")
//    영어 위키백과 문서 제목(Wikipedia 필드) → Wikidata 항목 순서로 찾고, 없을 때만 Wikidata ID를 쓴다.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 요청 제한(429)이면 기다렸다가 다시 시도 */
async function fetchJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "ChronoMap/0.1 (https://github.com/FlutterNeverDie/chrono-map; oasa741@gmail.com)",
      },
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

// 3-0) 원본이 엉뚱한 문서에 이어진 정치체(예: Qarlugs → "Mongol invasion of Central Asia")는
//      content/polity-names/wikipedia.txt에 적은 영어 위키백과 문서로 바꾼다. 한 줄에 "원본 이름 = 문서 제목".
//      "X"에 적으면 "(X)"에도 적용된다("(X)"를 따로 적으면 그쪽이 우선)
const titleOverrides = new Map();
if (existsSync(TITLE_OVERRIDES))
  readFileSync(TITLE_OVERRIDES, "utf8")
    .split("\n")
    .forEach((raw, i) => {
      const text = raw.trim();
      if (!text || text.startsWith("#")) return;
      const eq = text.indexOf(" = ");
      if (eq < 0)
        throw new Error(
          `content/polity-names/wikipedia.txt:${i + 1} "원본 이름 = 문서 제목" 형식이 아님: ${raw}`,
        );
      titleOverrides.set(text.slice(0, eq).trim(), text.slice(eq + 3).trim());
    });
for (const name of titleOverrides.keys())
  if (!polities.some((p) => p.Name === name))
    console.warn(
      `content/polity-names/wikipedia.txt: 원본에 없는 정치체 이름 "${name}"`,
    );
/** 이름을 찾을 문서 제목: 고친 문서가 있으면 그것(이때는 원본 Wikidata ID로 돌아가지 않는다) */
const titleOverrideOf = (name) =>
  titleOverrides.get(name) ??
  titleOverrides.get(name.match(/^\((.+)\)$/)?.[1] ?? "");

// 3-1) 위키백과 문서 제목 → Wikidata ID (넘겨주기·표기 정규화 반영)
const titleCache = readCache(TITLE_CACHE);
const titles = [
  ...new Set(
    polities
      .flatMap((p) => [p.Wikipedia, titleOverrideOf(p.Name)])
      .filter(Boolean),
  ),
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

const missingTitles = new Set();
const qidOfFeature = (p) => {
  const fixed = titleOverrideOf(p.Name);
  if (fixed) {
    if (
      !titleCache[fixed] &&
      !missingTitles.has(fixed) &&
      missingTitles.add(fixed)
    )
      console.warn(
        `content/polity-names/wikipedia.txt: 위키백과 문서를 찾지 못함 "${fixed}" (${p.Name})`,
      );
    return titleCache[fixed] ?? null;
  }
  return (p.Wikipedia && titleCache[p.Wikipedia]) || p.Wikidata || null;
};

// 3-2) Wikidata 항목 → 언어별 이름. 이름표(label)가 없으면 언어 변형(zh-hans, pt-br)과 그 언어 위키백과 문서 제목으로 채운다
const VARIANTS = {
  zh: ["zh-hans", "zh-cn", "zh-hant", "zh-tw"],
  pt: ["pt-br"],
};
const SITES = Object.fromEntries(LOCALES.map((l) => [l, `${l}wiki`]));
const labelCache = readCache(NAME_CACHE);
const qids = [...new Set(polities.map((p) => qidOfFeature(p)).filter(Boolean))];
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
for (const p of polities) {
  const q = qidOfFeature(p);
  if (q && !qidOfName.has(p.Name)) qidOfName.set(p.Name, q);
}
for (const name of Object.keys(overrides)) {
  if (!polities.some((p) => p.Name === name)) {
    console.warn(`content/polity-names: 원본에 없는 정치체 이름 "${name}"`);
  }
}

for (const locale of LOCALES) {
  const names = {};
  // Wikidata 이름 끝의 연도 괄호 "(1616-1636)"는 뗀다(위키백과 제목과 같은 규칙)
  for (const [name, q] of qidOfName)
    if (labelCache[q]?.[locale])
      names[name] = labelCache[q][locale].replace(
        /\s*\([^()]*\d{3,4}[^()]*\)\s*$/,
        "",
      );
  // "(Habsburg Monarchy)"처럼 괄호로 감싼 이름(종속·부속 영역)은 괄호 밖 이름을 그대로 쓴다
  const allNames = new Set(polities.map((p) => p.Name));
  const fill = (name) => {
    const inner = name.match(/^\((.+)\)$/)?.[1];
    if (inner && !names[name] && names[inner]) names[name] = names[inner];
  };
  for (const [name, byLocale] of Object.entries(overrides))
    if (byLocale[locale]) names[name] = byLocale[locale];
  // "X"를 고쳐 적었으면 "(X)"도 같은 이름("(X)"를 따로 적은 것이 우선) - 예전엔 "(X)"의 Wikidata 이름이 남았다(Franciaf)
  for (const name of allNames) {
    const inner = name.match(/^\((.+)\)$/)?.[1];
    if (inner && !overrides[name]?.[locale] && overrides[inner]?.[locale])
      names[name] = overrides[inner][locale];
  }
  allNames.forEach(fill);
  writeFileSync(`${OUT}/names/${locale}.json`, JSON.stringify(names));
}
console.log(
  `이름 ${qidOfName.size}개 × ${LOCALES.length}개 언어 (수정 ${Object.keys(overrides).length}개) → public/borders/names/`,
);
