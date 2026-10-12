import type { HistoryEvent, Locale, LocalizedText, WikiPage } from "./types";

/** 요청 언어 → 영어 → 한국어 순으로 있는 값을 고른다 */
export function pick(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? text.ko ?? "";
}

/** 사건 제목: 직접 쓴 제목 → 그 언어 위키백과 문서 제목 → 영어/한국어 대체 */
export function eventTitle(e: HistoryEvent, locale: Locale): string {
  return (
    e.title[locale] ??
    e.wiki[locale]?.title ??
    e.title.en ??
    e.wiki.en?.title ??
    e.title.ko ??
    e.id
  );
}

/**
 * 사건 설명: 그 언어 위키백과 요약 → 직접 쓴 요약 → 영어 위키백과 요약 → 대체.
 * `page`가 있으면 위키백과 원문이므로 화면에 출처(문서 링크, CC BY-SA 4.0)를 함께 보여야 한다.
 */
export function eventSummary(
  e: HistoryEvent,
  locale: Locale,
): { text: string; page?: WikiPage; lang: Locale } {
  const own = e.wiki[locale];
  if (own) return { text: own.extract, page: own, lang: locale };
  if (e.summary[locale]) return { text: e.summary[locale]!, lang: locale };
  if (e.wiki.en)
    return { text: e.wiki.en.extract, page: e.wiki.en, lang: "en" };
  if (e.summary.en) return { text: e.summary.en, lang: "en" };
  return { text: e.summary.ko ?? "", lang: "ko" };
}
