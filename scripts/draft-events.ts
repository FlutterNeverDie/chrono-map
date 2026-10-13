// Wikidata에서 세계사 주요 사건 후보를 뽑아 사건 파일 초안을 만든다.
//
//   npm run draft                       → content/drafts/wikidata.txt (검토용, 빌드에 안 들어감)
//   npm run draft -- --promote 70       → 위키백과 언어판이 70개 이상인 후보를 content/events/<지역>.txt에 바로 추가
//
// "중요도" 기준: 그 사건 문서가 있는 위키백과 언어판 수(sitelinks). 많은 언어로 쓰였을수록 세계적으로 알려진 사건.
// 이미 같은 위키백과 문서로 연결된 사건은 건너뛴다. 추가한 뒤에는 npm run wiki → npm run content.
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import type { CategoryId, RegionId } from "../src/lib/types";
import { readEvents, root } from "./lib/content";
import { regionOf } from "./lib/regionOf";

const USER_AGENT =
  "ChronoMap/0.1 (https://github.com/FlutterNeverDie/chrono-map; oasa741@gmail.com)";

/** 가져올 Wikidata 분류와 우리 카테고리, 최소 언어판 수 */
const CLASSES: {
  qid: string;
  label: string;
  category: CategoryId;
  minLinks: number;
}[] = [
  { qid: "Q178561", label: "전투", category: "war", minLinks: 45 },
  { qid: "Q198", label: "전쟁", category: "war", minLinks: 45 },
  { qid: "Q188055", label: "포위전", category: "war", minLinks: 40 },
  { qid: "Q350604", label: "무력 충돌", category: "war", minLinks: 45 },
  { qid: "Q131569", label: "조약", category: "politics", minLinks: 40 },
  { qid: "Q10931", label: "혁명", category: "politics", minLinks: 40 },
  { qid: "Q45382", label: "쿠데타", category: "politics", minLinks: 45 },
  { qid: "Q124734", label: "반란", category: "politics", minLinks: 45 },
  {
    qid: "Q13418847",
    label: "역사적 사건",
    category: "politics",
    minLinks: 45,
  },
  { qid: "Q2401485", label: "탐험", category: "exploration", minLinks: 35 },
];

type Candidate = {
  title: string;
  links: number;
  start: number;
  end: number;
  coords: [number, number];
  region: RegionId;
  category: CategoryId;
  kind: string;
};

/** Wikidata 날짜 → 연도. Wikidata는 천문 연도(0 = 기원전 1년)를 쓰므로 0 이하는 1을 뺀다 */
function yearOf(value?: string): number | null {
  const m = value?.match(/^(-?\d+)-/);
  if (!m) return null;
  const y = Number(m[1]);
  return y <= 0 ? y - 1 : y;
}

async function query(cls: (typeof CLASSES)[number]) {
  const sparql = `
SELECT ?article (MAX(?l) AS ?links) (SAMPLE(?p) AS ?point) (SAMPLE(?s) AS ?start) (SAMPLE(?e) AS ?end)
       (SAMPLE(?c) AS ?coord) (SAMPLE(?c2) AS ?coord2) WHERE {
  ?item wdt:P31 wd:${cls.qid} ; wikibase:sitelinks ?l .
  FILTER(?l >= ${cls.minLinks})
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?item wdt:P585 ?p }
  OPTIONAL { ?item wdt:P580 ?s }
  OPTIONAL { ?item wdt:P582 ?e }
  OPTIONAL { ?item wdt:P625 ?c }
  OPTIONAL { ?item wdt:P276/wdt:P625 ?c2 }
} GROUP BY ?article`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`Wikidata ${cls.label} 실패: ${res.status}`);
  type Cell = { value: string } | undefined;
  const data = (await res.json()) as {
    results: { bindings: Record<string, Cell>[] };
  };
  const out: Candidate[] = [];
  for (const row of data.results.bindings) {
    const start = yearOf(row.point?.value ?? row.start?.value);
    const point = (row.coord ?? row.coord2)?.value.match(
      /Point\((-?[\d.]+) (-?[\d.]+)\)/,
    );
    if (start === null || !point) continue; // 날짜나 좌표가 없으면 지도에 못 놓는다
    if (start > new Date().getFullYear()) continue; // Wikidata 입력 오류(미래 연도)
    const coords: [number, number] = [
      Math.round(Number(point[1]) * 100) / 100,
      Math.round(Number(point[2]) * 100) / 100,
    ];
    const end = Math.max(start, yearOf(row.end?.value) ?? start);
    out.push({
      title: decodeURIComponent(row.article!.value.split("/wiki/")[1]).replace(
        /_/g,
        " ",
      ),
      links: Number(row.links!.value),
      start,
      end,
      coords,
      region: regionOf(coords[0], coords[1]),
      category: cls.category,
      kind: cls.label,
    });
  }
  return out;
}

const slug = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const importance = (links: number) =>
  links >= 120 ? 5 : links >= 80 ? 4 : links >= 55 ? 3 : 2;

function block(c: Candidate, id: string) {
  return [
    `@ ${id}`,
    `wikipedia: ${c.title}`,
    `when: ${c.start === c.end ? c.start : `${c.start} ~ ${c.end}`}`,
    `coords: ${c.coords[0]}, ${c.coords[1]}`,
    `category: ${c.category}`,
    `importance: ${importance(c.links)}`,
  ].join("\n");
}

async function main() {
  const promoteAt = process.argv.includes("--promote")
    ? Number(process.argv[process.argv.indexOf("--promote") + 1])
    : null;

  const { events } = readEvents();
  const known = new Set(events.map((e) => e.wikipedia).filter(Boolean));
  const ids = new Set(events.map((e) => e.id));

  const all = new Map<string, Candidate>();
  for (const cls of CLASSES) {
    const found = await query(cls);
    for (const c of found)
      if (!all.has(c.title) || all.get(c.title)!.links < c.links)
        all.set(c.title, c);
    console.log(`  ${cls.label}: ${found.length}건`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  const fresh = [...all.values()]
    .filter((c) => !known.has(c.title))
    .sort((a, b) => a.start - b.start);

  mkdirSync(root("content/drafts"), { recursive: true });
  const draftFile = root("content/drafts/wikidata.txt");
  writeFileSync(
    draftFile,
    `# Wikidata 사건 후보 (자동 생성 ${new Date().toISOString().slice(0, 10)}) — 검토 후 content/events/<지역>.txt로 옮긴다\n` +
      `# 빌드에는 들어가지 않는다. "links" = 위키백과 언어판 수\n\n` +
      fresh
        .map(
          (c) =>
            `# ${c.kind} · ${c.region} · links ${c.links}\n${block(c, slug(c.title))}`,
        )
        .join("\n\n") +
      "\n",
  );
  console.log(`후보 ${fresh.length}건 → content/drafts/wikidata.txt`);

  if (promoteAt === null) return;
  const promoted = fresh.filter((c) => c.links >= promoteAt);
  for (const c of promoted) {
    let id = slug(c.title);
    while (ids.has(id)) id += "-x";
    ids.add(id);
    const file = root(`content/events/${c.region}.txt`);
    const body = readFileSync(file, "utf8").replace(/\n*$/, "\n\n");
    writeFileSync(file, body);
    appendFileSync(file, `${block(c, id)}\n`);
  }
  console.log(
    `언어판 ${promoteAt}개 이상 ${promoted.length}건을 content/events에 추가 → npm run wiki && npm run content`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
