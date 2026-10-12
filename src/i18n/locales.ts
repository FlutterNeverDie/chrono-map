import type { Locale } from "@/lib/types";

/** 지원 언어. 한국어 + 세계 주요 7개 언어 */
export const LOCALES: Locale[] = [
  "ko",
  "en",
  "zh",
  "es",
  "hi",
  "ar",
  "fr",
  "pt",
];
export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_INFO: Record<
  Locale,
  { nativeName: string; dir: "ltr" | "rtl" }
> = {
  ko: { nativeName: "한국어", dir: "ltr" },
  en: { nativeName: "English", dir: "ltr" },
  zh: { nativeName: "中文", dir: "ltr" },
  es: { nativeName: "Español", dir: "ltr" },
  hi: { nativeName: "हिन्दी", dir: "ltr" },
  ar: { nativeName: "العربية", dir: "rtl" },
  fr: { nativeName: "Français", dir: "ltr" },
  pt: { nativeName: "Português", dir: "ltr" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

/** 한국어(기본)는 `/`, 나머지는 `/en` 같은 하위 경로 */
export function localePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
}
