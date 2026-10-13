import type { Locale } from "@/lib/types";
import { DEFAULT_LOCALE, LOCALES, localeHref } from "@/i18n/locales";

/**
 * 공유 미리보기(OG) 이미지 한 장의 내용. 도메인을 모른다 — 각 화면이 글자와 점만 채워 넘긴다.
 * 그리기는 render.tsx, 글꼴 준비는 scripts/og-fonts.ts(이 글자들만 담은 부분 글꼴).
 */
export type OgCard = {
  /** 이미지에 쓸 언어(ogLocale로 고른 값) */
  locale: Locale;
  /** 맨 위 작은 글자(사이트 이름) */
  kicker: string;
  title: string;
  subtitle?: string;
  /** 제목 아래 목록(최대 3줄) */
  lines: string[];
  /** 지도에 찍을 점. strong은 진하게 */
  dots: { coords: [number, number]; strong?: boolean }[];
};

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * 이미지에 쓸 언어. 힌디어·아랍어는 글자 조합(셰이핑)·오른쪽→왼쪽 쓰기를 이미지 엔진(satori)이
 * 지원하지 않아 글자가 깨지므로 영어로 그린다.
 */
export function ogLocale(locale: Locale): Locale {
  return locale === "hi" || locale === "ar" ? "en" : locale;
}

/** 카드에 들어가는 모든 글자 (부분 글꼴을 만들 때) */
export function cardText(card: OgCard): string {
  return [card.kicker, card.title, card.subtitle ?? "", ...card.lines].join("");
}

/**
 * 메타데이터용 OG 이미지 항목. path는 언어 접두사 없는 경로("year/1490/og.png").
 * 힌디어·아랍어 페이지는 영어 이미지를 가리킨다(같은 그림을 두 번 만들지 않음).
 * 상대 주소는 레이아웃의 metadataBase로 절대 주소가 된다.
 */
export function ogImage(locale: Locale, path: string) {
  const l = ogLocale(locale);
  return [{ url: localeHref(l, path), ...OG_SIZE }];
}

/** 이미지를 따로 만드는 하위 경로 언어(ko는 /, hi·ar는 en 이미지를 씀) */
export const OG_PATH_LOCALES: Locale[] = LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE && ogLocale(l) === l,
);
