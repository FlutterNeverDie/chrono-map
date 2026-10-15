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

/**
 * 언어별 값에서 그 언어와 대체용 언어만 남긴다 — 브라우저로 보내는 데이터를 줄일 때.
 * 화면의 대체 순서와 같은 목록을 넘겨야 결과가 같다(pick: 영어 → 한국어, 위키백과 요약: 영어).
 */
export function keepLocales<T>(
  values: Partial<Record<Locale, T>>,
  locale: Locale,
  fallbacks: Locale[] = ["en", "ko"],
): Partial<Record<Locale, T>> {
  const out: Partial<Record<Locale, T>> = {};
  for (const l of [locale, ...fallbacks]) if (values[l]) out[l] = values[l];
  return out;
}

const only = (text: LocalizedText, locale: Locale) => keepLocales(text, locale);

/**
 * 화면(브라우저)에 보낼 사건: 그 언어 설명과 대체용 영어만 남긴다.
 * 8개 언어 위키백과 요약을 모두 보내지 않아 페이지가 가벼워진다. eventTitle·eventSummary 결과는 같다.
 */
export function localizeEvent(e: HistoryEvent, locale: Locale): HistoryEvent {
  const wiki: HistoryEvent["wiki"] = {};
  if (e.wiki[locale]) wiki[locale] = e.wiki[locale];
  else if (e.wiki.en) wiki.en = e.wiki.en;
  return {
    ...e,
    wiki,
    title: only(e.title, locale),
    place: only(e.place, locale),
    summary: only(e.summary, locale),
  };
}

/**
 * 검색·공유 미리보기 설명(약 160자): 문장 끝에서 끊을 수 있으면 거기서, 아니면 단어 사이에서 자르고 "…".
 * 띄어쓰기 없는 언어(중국어)는 글자 수로 자른다.
 */
export function clipText(text: string, max = 160): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max - 1);
  // 문장 끝: 마침표 뒤에 대문자로 시작하는 다음 문장("a.m. on"은 아님), 또는 。।؟
  let sentence = -1;
  for (const m of s.slice(0, max + 1).matchAll(/[.!?](?=\s+["“(]?\p{Lu})|[。।؟]/gu))
    if (m.index < max) sentence = m.index + 1;
  if (sentence >= max * 0.6) return head.slice(0, sentence);
  const space = head.lastIndexOf(" ");
  return (space >= max * 0.6 ? head.slice(0, space) : head).replace(/[\s,;:、，]+$/, "") + "…";
}
