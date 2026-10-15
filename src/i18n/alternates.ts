import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { LOCALES, localeHref } from "./locales";

/**
 * 같은 화면의 대표 주소(canonical)와 언어별 주소(hreflang). path는 언어 접두어를 뺀 경로("" = 첫 화면).
 * 상대 경로는 레이아웃의 metadataBase로 절대 주소가 된다 - www 같은 다른 주소로 들어와도 검색에는 이 주소 하나만 잡힌다.
 * 모든 페이지의 메타데이터에 넣는다(레이아웃에 두면 하위 페이지가 첫 화면 주소를 물려받으므로 두지 않는다).
 */
export function pageAlternates(
  locale: Locale,
  path: string,
): Metadata["alternates"] {
  return {
    canonical: localeHref(locale, path),
    languages: Object.fromEntries(LOCALES.map((l) => [l, localeHref(l, path)])),
  };
}
