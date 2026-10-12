import type { Locale, Localized } from "./types";

/** 요청 언어 → 영어 → 한국어 순으로 있는 값을 고른다 */
export function pick(text: Localized, locale: Locale): string {
  return text[locale] ?? text.en ?? text.ko;
}
