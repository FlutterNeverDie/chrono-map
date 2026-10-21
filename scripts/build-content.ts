// content/ (사람·AI가 편집하는 텍스트) + content/wikipedia.json (위키백과 요약)
//   → src/data/generated/content.json (앱이 읽는 데이터)
//
// 형식은 content/CLAUDE.md. 오류가 있으면 "파일:줄" 목록을 출력하고 실패한다.
// 네트워크를 쓰지 않는다 — 위키백과 요약은 미리 `npm run wiki`로 받아 둔 파일을 쓴다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Content, EventPhoto } from "../src/lib/types";
import { readEvents, readRankings, root } from "./lib/content";
import { readWikiCache, tidyPages } from "./lib/wikipedia";
import { listCampaigns, readTheme } from "./campaigns/lib";

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
  e.wiki = tidyPages(entry.pages);
}

// 사진(npm run photos가 받아 둔 public/photos + content/photos.json) - 파일이 있는 것만
const photos: Record<string, EventPhoto | null> = existsSync(root("content/photos.json"))
  ? JSON.parse(readFileSync(root("content/photos.json"), "utf8"))
  : {};
for (const e of events) {
  const p = photos[e.id];
  if (p && existsSync(root(`public/photos/${e.id}-s.webp`)))
    e.photo = p;
}

// 같은 위키백과 문서를 쓰는 전쟁 지도와 연결 → 사건 카드에 "전쟁 지도로 보기"
const campaignOf = new Map(
  listCampaigns().map((id) => [readTheme(id).wikipedia, id]),
);
for (const e of events) {
  const id = e.wikipedia && campaignOf.get(e.wikipedia);
  if (id) e.campaign = id;
}

if (errors.length) {
  console.error(`콘텐츠 오류 ${errors.length}건\n${errors.join("\n")}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const lastYear = Math.max(...events.map((e) => e.end));
const content: Content = { events, rankings, lastYear };
writeFileSync(join(OUT_DIR, "content.json"), JSON.stringify(content));
// 브라우저 코드(슬라이더 범위)가 쓰는 작은 값만 따로 — 큰 content.json이 브라우저 번들에 들어가지 않게
writeFileSync(join(OUT_DIR, "content-meta.json"), JSON.stringify({ lastYear }));
const linked = events.filter((e) => e.wikipedia).length;
console.log(
  `사건 ${events.length}건(위키백과 연결 ${linked}건), 시점별 순서 ${Object.keys(rankings).length}개 → src/data/generated/content.json`,
);
