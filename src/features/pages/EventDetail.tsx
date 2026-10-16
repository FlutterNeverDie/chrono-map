import type { ReactNode } from "react";
import type { Locale } from "@/lib/types";
import { fill, getMessages } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { pageAlternates } from "@/i18n/alternates";
import { clipText, eventSummary, eventTitle, pick } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { formatPeriod, periodOf } from "@/lib/period";
import { EVENTS } from "@/data/content";
import { ogImage } from "@/components/og/card";
import { DetailPage, titleWithWhen, type DetailLink } from "./DetailPage";
import { periodSlug } from "./years";

export function findEvent(id: string) {
  return EVENTS.find((e) => e.id === id);
}

/** 사건 상세 페이지 (/event/[id]). 공통 틀(DetailPage)에 사건 정보·버튼을 채운다 */
export function EventDetail({
  locale,
  id,
  ad,
}: {
  locale: Locale;
  id: string;
  /** 본문 아래 광고 자리(app이 features/ads의 AdSlot을 넣는다 — features끼리는 서로 import하지 않음) */
  ad?: ReactNode;
}) {
  const e = findEvent(id);
  if (!e) return null;
  const messages = getMessages(locale);
  const place = pick(e.place, locale);
  const when = formatWhen(e, locale);
  const rows: [string, string][] = [
    [messages.pages.period, when],
    [messages.pages.region, messages.regions[e.region]],
    ...(place ? ([[messages.pages.place, place]] as [string, string][]) : []),
    [messages.pages.category, messages.categories[e.category]],
  ];
  const links: DetailLink[] = [
    {
      href: `${localeHref(locale)}?y=${e.start}`,
      label: messages.pages.backToMap,
      primary: true,
    },
    {
      href: localeHref(locale, `year/${periodSlug(periodOf(e.start))}`),
      label: fill(messages.years.title, {
        period: formatPeriod(periodOf(e.start), locale),
      }),
    },
    ...(e.campaign
      ? [
          {
            href: localeHref(locale, `wars/${e.campaign}`),
            label: messages.wars.openMap,
          },
        ]
      : []),
  ];
  return (
    <DetailPage
      locale={locale}
      title={eventTitle(e, locale)}
      when={when}
      rows={rows}
      summary={eventSummary(e, locale)}
      links={links}
      sources={e.sources}
      related={{
        path: `event/${e.id}`,
        coords: e.coords,
        start: e.start,
        end: e.end,
        eventId: e.id,
        mapPath: e.campaign && `wars/${e.campaign}`,
      }}
      ad={ad}
    />
  );
}

export function eventMetadata(locale: Locale, id: string) {
  const e = findEvent(id);
  if (!e) return {};
  const messages = getMessages(locale);
  const summary = eventSummary(e, locale);
  const title = titleWithWhen(eventTitle(e, locale), formatWhen(e, locale));
  const description = clipText(summary.text);
  return {
    title: `${title} - ${messages.siteName}`,
    description,
    alternates: pageAlternates(locale, `event/${id}`),
    openGraph: {
      title,
      description,
      images: ogImage(locale, `event/${id}/og.png`),
    },
  };
}
