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

/** 언어만 바꾼 같은 화면 경로: "/en/wars/imjin-war" → "/fr/wars/imjin-war", "/wars" → "/en/wars" */
export function switchLocalePath(
  pathname: string,
  from: Locale,
  to: Locale,
): string {
  const rest =
    from === DEFAULT_LOCALE
      ? pathname
      : pathname.replace(new RegExp(`^/${from}(?=/|$)`), "");
  const prefix = to === DEFAULT_LOCALE ? "" : `/${to}`;
  return `${prefix}${rest === "/" ? "" : rest}` || "/";
}

/** 언어별 하위 경로: localeHref("ko", "about") → "/about", localeHref("en", "about") → "/en/about" */
export function localeHref(locale: Locale, path = ""): string {
  const base = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return path ? `${base}/${path}` : base || "/";
}
