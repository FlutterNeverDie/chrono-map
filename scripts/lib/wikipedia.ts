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

/**
 * 위키백과 요약 API가 발음·원어 표기 괄호를 지우면서 남기는 찌꺼기 정리 (내용은 그대로 두고 문장부호만).
 * "Ezana ; Ancient Greek: …, Aezana) was" → "Ezana (Ancient Greek: …, Aezana) was",
 * "Aryabhatiyam (IAST:, a Sanskrit …" → "Aryabhatiyam, a Sanskrit …", "shogunate , also" → "shogunate, also", "유로마이단(, 우크라이나어" → "유로마이단(우크라이나어"
 * 빌드 때 적용한다(받아 둔 wikipedia.json은 원문 그대로).
 */
export function tidyExtract(text: string, locale: string): string {
  let s = text
    .replace(/\(\s*[,;:]?\s*\)/g, "") // 빈 괄호
    .replace(/\s*\([^()\s]{1,12}:,\s*/g, (m, offset: number, all: string) =>
      // 값이 지워진 "(IAST:," - 닫는 괄호가 남아 있으면 "(", 없으면 쉼표
      /^[^(]*\)/.test(all.slice(offset + m.length)) ? " (" : ", ",
    )
    .replace(/\(\s*,\s*/g, "(")
    .replace(/,\s*,/g, ",");
  // 여는 괄호가 지워지고 " ; 원어 표기)"만 남은 경우 - 앞쪽 괄호 짝이 맞을 때만, 여러 군데면 모두
  for (let from = 0; ; ) {
    const m = / ; ([^();]*\))/.exec(s.slice(from));
    if (!m) break;
    const at = from + m.index;
    const before = s.slice(0, at);
    const balanced =
      (before.match(/\(/g) ?? []).length === (before.match(/\)/g) ?? []).length;
    if (balanced) s = `${before} (${m[1]}${s.slice(at + m[0].length)}`;
    from = at + 2;
  }
  // 영어: 괄호가 통째로 지워지고 남은 " ; " ("Sumaq Urqu ; is a mountain")
  if (locale === "en") s = s.replace(/ ; (?=[a-z])/g, " ");
  // 문장부호 앞 공백 (프랑스어는 ; : 앞에 띄어 쓰는 게 맞으므로 , . 만)
  s = s.replace(locale === "fr" ? /\s+([,.])(?=\s|$)/g : /\s+([,.;:])(?=\s|$)/g, "$1");
  s = s.replace(/ {2,}/g, " ").trim();
  // 뒤따르던 목록이 잘려 ":"로 끝나는 요약 - 그 앞 문장까지만, 앞 문장이 없으면 "…"
  if (/[:：]$/.test(s)) {
    const ends = [...s.matchAll(/[.!?。؟।](?=\s)/g)];
    s = ends.length ? s.slice(0, ends.at(-1)!.index + 1) : s.slice(0, -1) + "…";
  }
  return s;
}

/** 언어별 위키백과 요약 전체에 tidyExtract */
export function tidyPages(
  pages: Partial<Record<Locale, WikiPage>>,
): Partial<Record<Locale, WikiPage>> {
  return Object.fromEntries(
    Object.entries(pages).map(([l, p]) => [
      l,
      p && { ...p, extract: tidyExtract(p.extract, l) },
    ]),
  );
}

/**
 * 직접 쓴 설명(summary.<언어>)이 있는 언어는 그 언어 위키백과 요약을 뺀다 → 화면은 그 언어에서 직접 쓴 글을 출처 표기 없이 보여 준다.
 * 빼는 문서의 제목은 직접 쓴 제목(title.<언어>)이 없을 때 그 자리로 옮겨 둔다(요약만 맞지 않고 이름은 맞는 경우 - 힌두교 hi 등).
 * 전쟁·전투·주제 지도 항목에 쓴다(위키 문서가 동음이의어·요새·인물 문서처럼 맞지 않을 때).
 * 사건(content/events)은 쓰지 않는다 - 사건의 summary는 "그 언어 위키백과 문서가 없을 때"의 대체 설명이다.
 */
export function withoutOwn(
  pages: Partial<Record<Locale, WikiPage>>,
  summary: Partial<Record<Locale, string>> | undefined,
  title: Partial<Record<Locale, string>> | undefined,
): {
  wiki: Partial<Record<Locale, WikiPage>>;
  title: Partial<Record<Locale, string>>;
} {
  const wiki: Partial<Record<Locale, WikiPage>> = {};
  const titles: Partial<Record<Locale, string>> = { ...title };
  for (const [l, page] of Object.entries(pages) as [Locale, WikiPage][]) {
    if (!summary?.[l]) wiki[l] = page;
    else titles[l] ??= page.title;
  }
  return { wiki, title: titles };
}
