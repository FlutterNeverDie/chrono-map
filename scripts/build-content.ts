// content/ (사람·AI가 편집하는 텍스트) + content/wikipedia.json (위키백과 요약)
//   → src/data/generated/content.json (앱이 읽는 데이터)
//
// 형식은 content/CLAUDE.md. 오류가 있으면 "파일:줄" 목록을 출력하고 실패한다.
// 네트워크를 쓰지 않는다 — 위키백과 요약은 미리 `npm run wiki`로 받아 둔 파일을 쓴다.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Content } from "../src/lib/types";
import { readEvents, readRankings, root } from "./lib/content";
import { readWikiCache } from "./lib/wikipedia";

const OUT_DIR = root("src/data/generated");

const { events, errors } = readEvents();
const { rankings, errors: rankingErrors } = readRankings(
  new Set(events.map((e) => e.id)),
);
errors.push(...rankingErrors);

const wiki = readWikiCache();
for (const e of events) {
  if (!e.wikipedia) continue;
  const entry = wiki[e.wikipedia];
  if (!entry) {
    errors.push(
      `[${e.id}] 위키백과 "${e.wikipedia}" 요약이 없음 → npm run wiki`,
    );
    continue;
  }
  e.wiki = entry.pages;
}

if (errors.length) {
  console.error(`콘텐츠 오류 ${errors.length}건\n${errors.join("\n")}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const lastYear = Math.max(...events.map((e) => e.end));
const content: Content = { events, rankings, lastYear };
writeFileSync(join(OUT_DIR, "content.json"), JSON.stringify(content));
const linked = events.filter((e) => e.wikipedia).length;
console.log(
  `사건 ${events.length}건(위키백과 연결 ${linked}건), 시점별 순서 ${Object.keys(rankings).length}개 → src/data/generated/content.json`,
);
