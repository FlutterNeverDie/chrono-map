import type { HistoryEvent, Locale, LocalizedText, WikiPage } from "./types";

/** 요청 언어 → 영어 → 한국어 순으로 있는 값을 고른다 */
export function pick(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? text.ko ?? "";
}

type Wiki = Partial<Record<Locale, WikiPage>>;

/**
 * 이름(사건·전쟁·전투·주제 지도 항목 공통): 직접 쓴 이름(그 언어) → 그 언어 위키백과 → 직접 쓴 영어 → 영어 위키백과 → 직접 쓴 한국어.
 * 모두 없으면 undefined(호출부가 문서 제목·id로 대신한다).
 */
export function localizedTitle(
  own: LocalizedText | undefined,
  wiki: Wiki,
  locale: Locale,
): string | undefined {
  return (
    own?.[locale] ??
    wiki[locale]?.title ??
    own?.en ??
    wiki.en?.title ??
    own?.ko
  );
}

/**
 * 설명(공통): 그 언어 위키백과 → 직접 쓴 설명(그 언어) → 영어 위키백과 → 직접 쓴 영어 → 직접 쓴 한국어.
 * `page`가 있으면 위키백과 원문이므로 화면에 출처(문서 링크, CC BY-SA 4.0)를 함께 보여야 한다.
 * 직접 쓴 글을 위키백과보다 먼저 보여 주려면 빌드에서 그 언어 위키 요약을 뺀다(scripts/lib/wikipedia의 withoutOwn - 전쟁·주제 지도만).
 */
export function localizedSummary(
  own: LocalizedText | undefined,
  wiki: Wiki,
  locale: Locale,
): { text: string; page?: WikiPage; lang: Locale } {
  if (wiki[locale])
    return { text: wiki[locale].extract, page: wiki[locale], lang: locale };
  if (own?.[locale]) return { text: own[locale], lang: locale };
  if (wiki.en) return { text: wiki.en.extract, page: wiki.en, lang: "en" };
  if (own?.en) return { text: own.en, lang: "en" };
  if (own?.ko) return { text: own.ko, lang: "ko" };
  return { text: "", lang: locale };
}

/** 사건 제목: 직접 쓴 제목 → 그 언어 위키백과 문서 제목 → 영어/한국어 대체 */
export const eventTitle = (e: HistoryEvent, locale: Locale): string =>
  localizedTitle(e.title, e.wiki, locale) ?? e.id;

/** 사건 설명 (localizedSummary) */
export const eventSummary = (e: HistoryEvent, locale: Locale) =>
  localizedSummary(e.summary, e.wiki, locale);

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
 * 문장 끝 = 마침표·물음표·느낌표 뒤 공백 다음에 대문자나 대소문자 없는 글자(한글·아랍 문자·데바나가리 등)가 오는 곳
 * ("a.m. on"처럼 소문자가 오면 문장 끝이 아님), 또는 。।؟. 띄어쓰기 없는 언어(중국어)는 글자 수로 자른다.
 */
export function clipText(text: string, max = 160): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  // 문장 끝 기호가 max 안에 있으면 되고, 다음 문장 첫 글자 확인은 max 뒤까지 본다
  let sentence = -1;
  for (const m of s.matchAll(/[.!?](?=\s+["“(]?[\p{Lu}\p{Lo}])|[。।؟]/gu)) {
    if (m.index >= max) break;
    sentence = m.index + 1;
  }
  if (sentence >= max * 0.6) return s.slice(0, sentence);
  const head = s.slice(0, max - 1);
  const space = head.lastIndexOf(" ");
  return (
    (space >= max * 0.6 ? head.slice(0, space) : head).replace(
      /[\s,;:、，]+$/,
      "",
    ) + "…"
  );
}
