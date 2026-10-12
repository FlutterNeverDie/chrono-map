import type { Locale, WikiPage } from "@/lib/types";
import raw from "@/data/generated/ww2.json";

/**
 * 2차대전 지도 데이터 (content/ww2 → npm run ww2:build → src/data/generated/ww2.json).
 * 크로노맵 본 지도(features/map, data/content)와 섞지 않는다.
 * 시간 단위는 "월 번호" = 연도 × 12 + (월 − 1).
 */
export type Side = "axis" | "allies" | "neutral";
export type SideRule = {
  name: string;
  side: Side;
  from: number | null;
  to: number | null;
};
export type Battle = {
  id: string;
  wikipedia: string;
  start: number;
  end: number;
  coords: [number, number];
  /** 위키백과 언어판 수 — 중요도 */
  links: number;
  wiki: Partial<Record<Locale, WikiPage>>;
};

const data = raw as unknown as {
  first: number;
  last: number;
  battles: Battle[];
  sides: SideRule[];
};
export const FIRST_MONTH = data.first;
export const LAST_MONTH = data.last;
export const BATTLES = data.battles;
const SIDES = data.sides;

export const yearOfMonth = (m: number) => Math.floor(m / 12);

/** 그 달에 그 나라의 진영. 규칙이 여러 개면 기간이 맞는 마지막 규칙. 괄호 이름 "(X)"는 X 규칙도 본다 */
export function sideOf(name: string, month: number): Side {
  const inner = name.match(/^\((.+)\)$/)?.[1];
  let side: Side = "neutral";
  for (const r of SIDES) {
    if (r.name !== name && r.name !== inner) continue;
    if (
      (r.from === null || month >= r.from) &&
      (r.to === null || month <= r.to)
    )
      side = r.side;
  }
  return side;
}

/** 그 달에 진행 중인 전투, 중요한 순 */
export function battlesIn(month: number): Battle[] {
  return BATTLES.filter((b) => b.start <= month && b.end >= month).sort(
    (a, b) => b.links - a.links,
  );
}

/** "1942년 8월", "August 1942" … (브라우저·Node 내장 Intl) */
export function formatMonth(month: number, locale: Locale): string {
  const date = new Date(Date.UTC(yearOfMonth(month), month % 12, 1));
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonthRange(
  start: number,
  end: number,
  locale: Locale,
): string {
  return start === end
    ? formatMonth(start, locale)
    : `${formatMonth(start, locale)} – ${formatMonth(end, locale)}`;
}

export function battleTitle(b: Battle, locale: Locale): string {
  return b.wiki[locale]?.title ?? b.wiki.en?.title ?? b.wikipedia;
}

export function battleSummary(
  b: Battle,
  locale: Locale,
): { text: string; page?: WikiPage; lang: Locale } {
  const own = b.wiki[locale];
  if (own) return { text: own.extract, page: own, lang: locale };
  if (b.wiki.en)
    return { text: b.wiki.en.extract, page: b.wiki.en, lang: "en" };
  return { text: "", lang: locale };
}
