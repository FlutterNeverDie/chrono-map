import type { HistoryEvent, Locale } from "@/lib/types";
import { fill, getMessages } from "@/i18n";
import { eventTitle, pick } from "@/lib/localize";
import { formatPeriod, formatPeriodRange, periodOf } from "@/lib/period";
import { visibleEvents } from "@/lib/events";
import { formatWhen } from "@/lib/year";
import { EVENTS } from "@/data/content";
import { ogLocale, type OgCard } from "@/components/og/card";
import { findEvent } from "./EventDetail";
import { YEAR_PERIODS, periodSlug, yearPage } from "./years";

/**
 * 공유 미리보기(OG) 이미지 내용. 그리기는 components/og/render.tsx,
 * 라우트는 app/…/og.png/route.tsx(빌드 때 PNG 파일로 만들어짐).
 */

const dot = (e: HistoryEvent, strong = false) => ({ coords: e.coords, strong });

/** 사이트 첫 화면: 사이트 이름 + 소개, 중요도 5 사건을 진한 점으로 */
export function homeCard(pageLocale: Locale): OgCard {
  const locale = ogLocale(pageLocale);
  const m = getMessages(locale);
  return {
    locale,
    kicker: m.siteName,
    title: m.metaTitle.split(" - ")[1] ?? m.metaTitle,
    subtitle: m.metaDescription,
    lines: [],
    dots: EVENTS.map((e) => dot(e, e.importance === 5)),
  };
}

export function yearCard(pageLocale: Locale, slug: string): OgCard | null {
  const data = yearPage(slug);
  if (!data) return null;
  const locale = ogLocale(pageLocale);
  const m = getMessages(locale);
  return {
    locale,
    kicker: m.siteName,
    title: fill(m.years.title, { period: formatPeriod(data.period, locale) }),
    subtitle: formatPeriodRange(data.period, locale),
    lines: data.events.slice(0, 3).map((e) => eventTitle(e, locale)),
    dots: [
      ...[...data.ongoing, ...data.nearby].map((e) => dot(e)),
      ...data.events.map((e) => dot(e, true)),
    ],
  };
}

export function eventCard(pageLocale: Locale, id: string): OgCard | null {
  const e = findEvent(id);
  if (!e) return null;
  const locale = ogLocale(pageLocale);
  const m = getMessages(locale);
  return {
    locale,
    kicker: m.siteName,
    title: eventTitle(e, locale),
    subtitle: formatWhen(e, locale),
    lines: [
      pick(e.place, locale),
      m.regions[e.region],
      m.categories[e.category],
    ].filter(Boolean),
    dots: [
      ...visibleEvents(EVENTS, periodOf(e.start))
        .filter((o) => o !== e)
        .map((o) => dot(o)),
      dot(e, true),
    ],
  };
}

/** 사이트의 모든 OG 이미지 내용 (scripts/og-fonts.ts가 필요한 글자를 모을 때) */
export function allCards(locales: Locale[]): OgCard[] {
  return locales.flatMap((l) => [
    homeCard(l),
    ...YEAR_PERIODS.map((p) => yearCard(l, periodSlug(p))!),
    ...EVENTS.map((e) => eventCard(l, e.id)!),
  ]);
}
