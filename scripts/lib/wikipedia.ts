// content/wikipedia.json — 위키백과에서 받아 둔 사건 요약 (npm run wiki가 쓰고, build-content가 읽는다)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Locale, WikiPage } from "../../src/lib/types";
import { root } from "./content";

export const WIKI_FILE = root("content/wikipedia.json");

export type WikiEntry = {
  /** Wikidata 항목 ID (언어 간 연결에 사용) */
  qid: string | null;
  /** 받아 온 날짜 */
  fetched: string;
  pages: Partial<Record<Locale, WikiPage>>;
};

/** 열쇠: 사건 파일의 `wikipedia:` 값(영어 위키백과 문서 제목) */
export type WikiCache = Record<string, WikiEntry>;

export function readWikiCache(): WikiCache {
  return existsSync(WIKI_FILE)
    ? JSON.parse(readFileSync(WIKI_FILE, "utf8"))
    : {};
}

export function writeWikiCache(cache: WikiCache): void {
  const sorted = Object.fromEntries(
    Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(WIKI_FILE, JSON.stringify(sorted, null, 2) + "\n");
}
