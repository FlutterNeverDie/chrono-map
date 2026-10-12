// 사건의 위키백과 요약을 8개 언어로 받아 content/wikipedia.json에 저장한다.
//
//   npm run wiki             아직 받지 않은 문서만
//   npm run wiki -- --all    전부 다시 받기 (위키백과 내용이 바뀌었을 때)
//
// 흐름: 사건 파일의 `wikipedia:` (영어 문서 제목)
//   → 영어 위키백과에서 Wikidata 항목 ID 찾기 (넘겨주기·표기 정규화 반영)
//   → Wikidata에서 언어별 위키백과 문서 제목 (sitelinks)
//   → 언어별 위키백과 REST API page/summary (제목, 첫 문단, 문서 주소)
//
// 사용하는 API는 모두 무료·키 없음. 위키백과 글은 CC BY-SA 4.0 → 화면에 문서 링크로 출처를 표기한다.
// 결과 파일은 git에 올린다(빌드 때 네트워크를 쓰지 않도록).
import type { Locale, WikiPage } from "../src/lib/types";
import { LOCALES } from "../src/i18n/locales";
import { readEvents } from "./lib/content";
import { readWikiCache, writeWikiCache, type WikiEntry } from "./lib/wikipedia";

const USER_AGENT =
  "ChronoMap/0.1 (https://github.com/FlutterNeverDie/chrono-map)";
const refreshAll = process.argv.includes("--all");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(
  url: string,
  headers: Record<string, string> = {},
): Promise<T | null> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, ...headers },
    });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 404) return null;
    if (res.status !== 429 || attempt >= 5)
      throw new Error(`요청 실패 ${res.status}: ${url}`);
    const wait =
      Number(res.headers.get("retry-after")) * 1000 || 5000 * attempt;
    console.log(`  요청 제한, ${wait / 1000}초 후 재시도`);
    await sleep(wait);
  }
}

/** 영어 문서 제목들 → Wikidata 항목 ID */
async function resolveQids(
  titles: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    type Res = {
      query?: {
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
        pages?: Record<
          string,
          { title: string; pageprops?: { wikibase_item?: string } }
        >;
      };
    };
    const data = await getJson<Res>(
      "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item" +
        `&titles=${encodeURIComponent(batch.join("|"))}`,
    );
    const follow = new Map<string, string>();
    for (const n of data?.query?.normalized ?? []) follow.set(n.from, n.to);
    for (const r of data?.query?.redirects ?? []) follow.set(r.from, r.to);
    const qidOf = new Map(
      Object.values(data?.query?.pages ?? {}).map((p) => [
        p.title,
        p.pageprops?.wikibase_item ?? null,
      ]),
    );
    for (const t of batch) {
      let title = t;
      for (let k = 0; k < 3 && follow.has(title); k++)
        title = follow.get(title)!;
      result.set(t, qidOf.get(title) ?? null);
    }
  }
  return result;
}

/** Wikidata 항목 → 언어별 위키백과 문서 제목 */
async function sitelinks(
  qids: string[],
): Promise<Map<string, Partial<Record<Locale, string>>>> {
  const result = new Map<string, Partial<Record<Locale, string>>>();
  const sites = LOCALES.map((l) => `${l}wiki`);
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    type Res = {
      entities?: Record<
        string,
        { sitelinks?: Record<string, { title: string }> }
      >;
    };
    const data = await getJson<Res>(
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks" +
        `&sitefilter=${sites.join("|")}&ids=${batch.join("|")}`,
    );
    for (const q of batch) {
      const links = data?.entities?.[q]?.sitelinks ?? {};
      result.set(
        q,
        Object.fromEntries(
          LOCALES.filter((l) => links[`${l}wiki`]).map((l) => [
            l,
            links[`${l}wiki`].title,
          ]),
        ),
      );
    }
    await sleep(500);
  }
  return result;
}

/** 위키백과 REST API: 문서 요약 */
async function summary(
  locale: Locale,
  title: string,
): Promise<WikiPage | null> {
  type Res = {
    type: string;
    title: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  const data = await getJson<Res>(
    `https://${locale}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    // 중국어는 간체로 받는다
    locale === "zh" ? { "Accept-Language": "zh-hans" } : {},
  );
  if (!data?.extract || data.type === "disambiguation") return null;
  return {
    title: data.title,
    extract: data.extract.trim(),
    url:
      data.content_urls?.desktop?.page ??
      `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

// ── 실행 ──────────────────────────────────────────────
async function main() {
  const { events, errors } = readEvents();
  if (errors.length) {
    console.error(
      `콘텐츠 오류 ${errors.length}건 (먼저 고쳐 주세요)\n${errors.join("\n")}`,
    );
    process.exit(1);
  }

  const cache = readWikiCache();
  const titles = [
    ...new Set(events.map((e) => e.wikipedia).filter((t): t is string => !!t)),
  ];
  const todo = refreshAll ? titles : titles.filter((t) => !cache[t]);
  if (!todo.length) {
    console.log(
      `받을 문서 없음 (전체 ${titles.length}개 받아 둠). 다시 받으려면 npm run wiki -- --all`,
    );
    return;
  }

  console.log(`위키백과 문서 ${todo.length}개 받는 중…`);
  const qids = await resolveQids(todo);
  const links = await sitelinks([
    ...new Set([...qids.values()].filter((q): q is string => !!q)),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const missing: string[] = [];

  for (const title of todo) {
    const qid = qids.get(title) ?? null;
    if (!qid) {
      missing.push(`"${title}": 영어 위키백과에 없는 문서 (제목 확인)`);
      continue;
    }
    const entry: WikiEntry = { qid, fetched: today, pages: {} };
    for (const locale of LOCALES) {
      const localTitle = links.get(qid)?.[locale];
      if (!localTitle) continue;
      const page = await summary(locale, localTitle);
      if (page) entry.pages[locale] = page;
      await sleep(100);
    }
    cache[title] = entry;
    const langs = LOCALES.filter((l) => entry.pages[l]);
    console.log(`  ${title} → ${langs.length}개 언어 (${langs.join(" ")})`);
  }

  writeWikiCache(cache);
  if (missing.length) {
    console.error(
      `\n받지 못한 문서 ${missing.length}개\n${missing.join("\n")}`,
    );
    process.exit(1);
  }
  console.log(`완료 → content/wikipedia.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
