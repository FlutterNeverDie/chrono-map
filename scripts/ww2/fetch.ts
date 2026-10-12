// 2차대전 전투 목록·위키백과 요약 받기 (네트워크 사용)
//
//   npm run ww2:fetch            content/ww2/battles.txt가 없으면 Wikidata에서 만들고, 빠진 위키백과 요약만 받음
//   npm run ww2:fetch -- --list  전투 목록을 Wikidata에서 다시 만듦(직접 추가한 전투는 EXTRA에 두면 유지)
//
// 전투 = 1937~1945년에 시작한 전투·군사작전·포위전·전역 중 위키백과 언어판 25개 이상(+ EXTRA).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { USER_AGENT, fetchSummaries, sleep } from "../lib/wikipediaApi";
import { BATTLES_FILE, WIKI_FILE, readBattles } from "./lib";

/** Wikidata에서 분류가 달라 빠지는 주요 전투(직접 지정) */
const EXTRA: { wikipedia: string; when: string; coords: string }[] = [
  {
    wikipedia: "Operation Barbarossa",
    when: "1941-06 ~ 1941-12",
    coords: "30.5, 52.0",
  },
  {
    wikipedia: "Battle of Britain",
    when: "1940-07 ~ 1940-10",
    coords: "-0.13, 51.5",
  },
  {
    wikipedia: "Battle of the Bulge",
    when: "1944-12 ~ 1945-01",
    coords: "5.9, 50.2",
  },
  {
    wikipedia: "Atomic bombings of Hiroshima and Nagasaki",
    when: "1945-08",
    coords: "132.46, 34.39",
  },
  {
    wikipedia: "Battle of Shanghai",
    when: "1937-08 ~ 1937-11",
    coords: "121.47, 31.23",
  },
  {
    wikipedia: "Battle of Wuhan",
    when: "1938-06 ~ 1938-10",
    coords: "114.3, 30.59",
  },
  {
    wikipedia: "Battle of Bataan",
    when: "1942-01 ~ 1942-04",
    coords: "120.5, 14.6",
  },
  {
    wikipedia: "Operation Bagration",
    when: "1944-06 ~ 1944-08",
    coords: "27.56, 53.9",
  },
  {
    wikipedia: "Warsaw Uprising",
    when: "1944-08 ~ 1944-10",
    coords: "21.01, 52.23",
  },
  { wikipedia: "Winter War", when: "1939-11 ~ 1940-03", coords: "29.0, 61.5" },
];

const slug = (t: string) =>
  t
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

async function buildList() {
  const sparql = `
SELECT ?article (MAX(?l) AS ?links) (SAMPLE(?s) AS ?start) (SAMPLE(?e) AS ?end) (SAMPLE(?p) AS ?point)
       (SAMPLE(?c) AS ?coord) (SAMPLE(?c2) AS ?coord2) WHERE {
  VALUES ?cls { wd:Q178561 wd:Q645883 wd:Q188055 wd:Q831663 wd:Q1261499 wd:Q2001676 }
  ?b wdt:P31 ?cls ; wikibase:sitelinks ?l .
  FILTER(?l >= 25)
  { ?b wdt:P580 ?s } UNION { ?b wdt:P585 ?p }
  BIND(COALESCE(?s, ?p) AS ?d)
  FILTER(YEAR(?d) >= 1937 && YEAR(?d) <= 1945)
  ?article schema:about ?b ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?b wdt:P582 ?e }
  OPTIONAL { ?b wdt:P625 ?c } OPTIONAL { ?b wdt:P276/wdt:P625 ?c2 }
} GROUP BY ?article`;
  const res = await fetch(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`,
    {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": USER_AGENT,
      },
    },
  );
  if (!res.ok) throw new Error(`Wikidata 실패 ${res.status}`);
  type Cell = { value: string } | undefined;
  const rows = (
    (await res.json()) as { results: { bindings: Record<string, Cell>[] } }
  ).results.bindings;

  const month = (v?: string) => v?.slice(0, 7);
  const items = new Map<
    string,
    { wikipedia: string; when: string; coords: string; links: number }
  >();
  for (const r of rows) {
    const start = month((r.start ?? r.point)?.value);
    const point = (r.coord ?? r.coord2)?.value.match(
      /Point\((-?[\d.]+) (-?[\d.]+)\)/,
    );
    if (!start || !point) continue;
    const end = month(r.end?.value);
    const title = decodeURIComponent(
      r.article!.value.split("/wiki/")[1],
    ).replace(/_/g, " ");
    items.set(title, {
      wikipedia: title,
      when: end && end > start ? `${start} ~ ${end}` : start,
      coords: `${Math.round(Number(point[1]) * 100) / 100}, ${Math.round(Number(point[2]) * 100) / 100}`,
      links: Number(r.links!.value),
    });
  }
  for (const x of EXTRA)
    items.set(x.wikipedia, {
      ...x,
      links: items.get(x.wikipedia)?.links ?? 60,
    });

  const sorted = [...items.values()].sort((a, b) =>
    a.when.localeCompare(b.when),
  );
  writeFileSync(
    BATTLES_FILE,
    `# 2차대전 전투 (Wikidata 자동 + 직접 추가). 형식은 content/ww2/CLAUDE.md\n# links = 위키백과 언어판 수(중요도)\n\n` +
      sorted
        .map(
          (b) =>
            `@ ${slug(b.wikipedia)}\nwikipedia: ${b.wikipedia}\nwhen: ${b.when}\ncoords: ${b.coords}\nlinks: ${b.links}`,
        )
        .join("\n\n") +
      "\n",
  );
  console.log(`전투 ${sorted.length}건 → content/ww2/battles.txt`);
}

async function main() {
  if (!existsSync(BATTLES_FILE) || process.argv.includes("--list"))
    await buildList();

  const cache = existsSync(WIKI_FILE)
    ? JSON.parse(readFileSync(WIKI_FILE, "utf8"))
    : {};
  const todo = [...new Set(readBattles().map((b) => b.wikipedia))].filter(
    (t) => !cache[t],
  );
  if (!todo.length) return console.log("받을 위키백과 문서 없음");
  console.log(`위키백과 요약 ${todo.length}건 받는 중…`);
  let n = 0;
  await fetchSummaries(todo, (title, pages) => {
    cache[title] = { pages };
    if (++n % 20 === 0) {
      writeFileSync(WIKI_FILE, JSON.stringify(cache, null, 2) + "\n");
      console.log(`  ${n}/${todo.length}`);
    }
  });
  writeFileSync(WIKI_FILE, JSON.stringify(cache, null, 2) + "\n");
  await sleep(0);
  console.log("완료 → content/ww2/wikipedia.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
