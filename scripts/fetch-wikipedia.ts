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
import { LOCALES } from "../src/i18n/locales";
import { resolveQids, sitelinks, summary, sleep } from "./lib/wikipediaApi";

const refreshAll = process.argv.includes("--all");
import { readEvents } from "./lib/content";
import { readWikiCache, writeWikiCache, type WikiEntry } from "./lib/wikipedia";

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
