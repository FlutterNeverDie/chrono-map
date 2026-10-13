import type { Locale } from "@/lib/types";
import { fill, getMessages } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { eventSummary, eventTitle, pick } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { formatPeriod, periodOf } from "@/lib/period";
import { EVENTS } from "@/data/content";
import { ExternalIcon } from "@/components/ui/icons";
import { ogImage } from "@/components/og/card";
import { periodSlug } from "./years";

export function findEvent(id: string) {
  return EVENTS.find((e) => e.id === id);
}

/** 사건 상세 페이지 (/event/[id]). 위키백과 첫 문단 + 출처 + 지도로 돌아가는 링크 */
export function EventDetail({ locale, id }: { locale: Locale; id: string }) {
  const e = findEvent(id);
  if (!e) return null;
  const messages = getMessages(locale);
  const summary = eventSummary(e, locale);
  const place = pick(e.place, locale);
  const rows: [string, string][] = [
    [messages.pages.period, formatWhen(e, locale)],
    [messages.pages.region, messages.regions[e.region]],
    ...(place ? ([[messages.pages.place, place]] as [string, string][]) : []),
    [messages.pages.category, messages.categories[e.category]],
  ];

  return (
    <article>
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
        {eventTitle(e, locale)}
      </h1>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-base">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p lang={summary.lang} className="mt-8 text-lg leading-relaxed">
        {summary.text}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a
          href={`${localeHref(locale)}?y=${e.start}`}
          className="inline-flex h-12 items-center rounded-md bg-foreground px-5 text-base font-semibold text-background"
        >
          {messages.pages.backToMap}
        </a>
        <a
          href={localeHref(locale, `year/${periodSlug(periodOf(e.start))}`)}
          className="inline-flex h-12 items-center rounded-md border border-foreground px-5 text-base font-semibold"
        >
          {fill(messages.years.title, {
            period: formatPeriod(periodOf(e.start), locale),
          })}
        </a>
        {e.campaign && (
          <a
            href={localeHref(locale, `wars/${e.campaign}`)}
            className="inline-flex h-12 items-center rounded-md border border-foreground px-5 text-base font-semibold"
          >
            {messages.wars.openMap}
          </a>
        )}
        {summary.page && (
          <a
            href={summary.page.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-1.5 rounded-md border border-line px-5 text-base font-medium"
          >
            {messages.ui.readMore}
            <ExternalIcon className="size-4" />
          </a>
        )}
      </div>
      {summary.page && (
        <p className="mt-4 text-sm text-muted">
          {messages.pages.sources}: {messages.ui.wikipedia} —{" "}
          {summary.page.title} · CC BY-SA 4.0
        </p>
      )}
      {e.sources.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {e.sources.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {decodeURI(url)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function eventMetadata(locale: Locale, id: string) {
  const e = findEvent(id);
  if (!e) return {};
  const messages = getMessages(locale);
  const summary = eventSummary(e, locale);
  const title = `${eventTitle(e, locale)} (${formatWhen(e, locale)})`;
  const description = summary.text.slice(0, 160);
  return {
    title: `${title} — ${messages.siteName}`,
    description,
    openGraph: {
      title,
      description,
      images: ogImage(locale, `event/${id}/og.png`),
    },
  };
}
