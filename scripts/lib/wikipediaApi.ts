// 위키백과·Wikidata API 호출 (무료, 키 없음). fetch-wikipedia.ts와 ww2 스크립트가 같이 쓴다.
import type { Locale, WikiPage } from "../../src/lib/types";
import { LOCALES } from "../../src/i18n/locales";

export const USER_AGENT =
  "ChronoMap/0.1 (https://github.com/FlutterNeverDie/chrono-map; oasa741@gmail.com)";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getJson<T>(
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
export async function resolveQids(
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
export async function sitelinks(
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
export async function summary(
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

/** 영어 문서 제목들 → 언어별 위키백과 요약. 받은 언어만 담긴다 */
export async function fetchSummaries(
  titles: string[],
  onEach?: (title: string, pages: Partial<Record<Locale, WikiPage>>) => void,
): Promise<
  Map<string, { qid: string | null; pages: Partial<Record<Locale, WikiPage>> }>
> {
  const qids = await resolveQids(titles);
  const links = await sitelinks([
    ...new Set([...qids.values()].filter((q): q is string => !!q)),
  ]);
  const result = new Map<
    string,
    { qid: string | null; pages: Partial<Record<Locale, WikiPage>> }
  >();
  for (const title of titles) {
    const qid = qids.get(title) ?? null;
    const pages: Partial<Record<Locale, WikiPage>> = {};
    if (qid) {
      for (const locale of LOCALES) {
        const localTitle = links.get(qid)?.[locale];
        if (!localTitle) continue;
        const page = await summary(locale, localTitle);
        if (page) pages[locale] = page;
        await sleep(100);
      }
    }
    result.set(title, { qid, pages });
    onEach?.(title, pages);
  }
  return result;
}
