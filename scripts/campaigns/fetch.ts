// 전쟁 지도: 전투 목록(Wikidata)·위키백과 요약 받기 (네트워크 사용, 결과는 content/campaigns/<id>/에 저장해 재사용)
//
//   npm run wars:fetch                    모든 전쟁: battles.txt가 없으면 만들고, 빠진 위키백과 요약만 받기
//   npm run wars:fetch -- imjin-war       특정 전쟁만
//   npm run wars:fetch -- --list          전투 목록을 Wikidata에서 다시 만들기(손으로 고친 battles.txt는 덮어씀, exclude-battles.txt는 빼고)
//
// 전투 = 그 전쟁 기간에 search 범위 안에서 일어난 전투·포위전·군사작전 중 위키백과 언어판 min-links개 이상.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { USER_AGENT, fetchSummaries, sleep } from "../lib/wikipediaApi";
import {
  dirOf,
  listCampaigns,
  readBattles,
  readExcluded,
  readTheme,
  type Theme,
} from "./lib";

const slug = (t: string) =>
  t
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** Wikidata 날짜 → 연도(천문 연도 보정: 0 이하는 1을 뺀다), 월 */
function parseDate(v?: string): { year: number; month: number } | null {
  const m = v?.match(/^(-?\d+)-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  return { year: y <= 0 ? y - 1 : y, month: Number(m[2]) };
}

async function buildList(t: Theme) {
  const { west, east, south, north } = t.search;
  const sparql = `
SELECT ?article (MAX(?l) AS ?links) (SAMPLE(?s) AS ?start) (SAMPLE(?e) AS ?end) (SAMPLE(?c) AS ?coord) WHERE {
  VALUES ?cls { wd:Q178561 wd:Q188055 wd:Q645883 wd:Q831663 wd:Q1261499 wd:Q2001676 }
  ?b wdt:P31 ?cls ; wikibase:sitelinks ?l .
  FILTER(?l >= ${t.minLinks})
  { ?b wdt:P580 ?s } UNION { ?b wdt:P585 ?s }
  FILTER(YEAR(?s) >= ${t.startYear <= 0 ? t.startYear + 1 : t.startYear} && YEAR(?s) <= ${t.endYear <= 0 ? t.endYear + 1 : t.endYear})
  ?b wdt:P625 ?c .
  BIND(geof:longitude(?c) AS ?lon) BIND(geof:latitude(?c) AS ?lat)
  FILTER(?lon >= ${west} && ?lon <= ${east} && ?lat >= ${south} && ?lat <= ${north})
  ?article schema:about ?b ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?b wdt:P582 ?e }
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
  if (!res.ok) throw new Error(`${t.id}: Wikidata 실패 ${res.status}`);
  type Cell = { value: string } | undefined;
  const rows = (
    (await res.json()) as { results: { bindings: Record<string, Cell>[] } }
  ).results.bindings;

  const excluded = readExcluded(t.id);
  const fmt = (d: { year: number; month: number }) =>
    t.unit === "year"
      ? String(d.year)
      : `${d.year}-${String(d.month).padStart(2, "0")}`;
  const items = rows
    .map((r) => {
      const s = parseDate(r.start?.value);
      const p = r.coord?.value.match(/Point\((-?[\d.]+) (-?[\d.]+)\)/);
      if (!s || !p) return null;
      const e = parseDate(r.end?.value);
      const a = fmt(s);
      const b = e ? fmt(e) : a;
      return {
        wikipedia: decodeURIComponent(
          r.article!.value.split("/wiki/")[1],
        ).replace(/_/g, " "),
        when: b !== a && b > a ? `${a} ~ ${b}` : a,
        sort: s.year * 12 + s.month,
        coords: `${Math.round(Number(p[1]) * 100) / 100}, ${Math.round(Number(p[2]) * 100) / 100}`,
        links: Number(r.links!.value),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    // exclude-battles.txt(다른 전쟁의 전투)는 다시 만들 때도 넣지 않는다
    .filter(
      (x) => !excluded.has(x.wikipedia) && !excluded.has(slug(x.wikipedia)),
    )
    .sort((x, y) => x.sort - y.sort);

  writeFileSync(
    `${dirOf(t.id)}/battles.txt`,
    `# ${t.wikipedia} 전투 (Wikidata 자동 생성, 직접 고쳐도 됨). 형식은 content/campaigns/CLAUDE.md\n\n` +
      items
        .map(
          (b) =>
            `@ ${slug(b.wikipedia)}\nwikipedia: ${b.wikipedia}\nwhen: ${b.when}\ncoords: ${b.coords}\nlinks: ${b.links}`,
        )
        .join("\n\n") +
      "\n",
  );
  console.log(`  ${t.id}: 전투 ${items.length}건 → battles.txt`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const relist = process.argv.includes("--list");
  const ids = args.length ? args : listCampaigns();

  for (const id of ids) {
    const theme = readTheme(id);
    if (relist || !existsSync(`${dirOf(id)}/battles.txt`)) {
      await buildList(theme);
      await sleep(2000);
    }
    const wikiFile = `${dirOf(id)}/wikipedia.json`;
    const cache = existsSync(wikiFile)
      ? JSON.parse(readFileSync(wikiFile, "utf8"))
      : {};
    const titles = [
      theme.wikipedia,
      ...readBattles(id, theme.unit).map((b) => b.wikipedia),
    ];
    const todo = [...new Set(titles)].filter(
      (t): t is string => !!t && !cache[t],
    );
    if (!todo.length) continue;
    console.log(`  ${id}: 위키백과 요약 ${todo.length}건 받는 중…`);
    let n = 0;
    await fetchSummaries(todo, (title, pages) => {
      cache[title] = { pages };
      if (++n % 20 === 0)
        writeFileSync(wikiFile, JSON.stringify(cache, null, 2) + "\n");
    });
    writeFileSync(wikiFile, JSON.stringify(cache, null, 2) + "\n");
  }
  console.log("완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
