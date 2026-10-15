import type { ReactNode } from "react";
import type { HistoryEvent, Locale } from "@/lib/types";
import { fill, getMessages } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { pageAlternates } from "@/i18n/alternates";
import { clipText, eventSummary, eventTitle, pick } from "@/lib/localize";
import { formatWhen, formatYear, formatYearRange } from "@/lib/year";
import { formatPeriod, periodOf } from "@/lib/period";
import { EVENTS } from "@/data/content";
import { reportIssueUrl } from "@/data/links";
import { ExternalIcon } from "@/components/ui/icons";
import { ogImage } from "@/components/og/card";
import { MapChips } from "./MapChips";
import { eventRelated, type LandRow } from "./related";
import { periodSlug } from "./years";

export function findEvent(id: string) {
  return EVENTS.find((e) => e.id === id);
}

/** 사건 상세 페이지 (/event/[id]). 위키백과 첫 문단 + 출처 + 지도로 돌아가는 링크 */
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
  const summary = eventSummary(e, locale);
  const related = eventRelated(e, locale);
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
      <NearbyEvents
        locale={locale}
        event={e}
        before={related.before}
        after={related.after}
      />
      <Lands locale={locale} runs={related.lands} now={related.landNow} />
      {ad}
      <MapChips locale={locale} maps={related.maps} />
      <a
        href={reportIssueUrl(
          eventTitle(e, locale),
          localeHref(locale, `event/${e.id}`),
        )}
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted underline hover:text-foreground"
      >
        {messages.pages.report}
        <ExternalIcon className="size-3.5" />
      </a>
    </article>
  );
}

/** 이 땅의 앞뒤 사건: 가까운 곳의 앞 사건 → 이 사건(강조) → 뒤 사건 */
function NearbyEvents({
  locale,
  event,
  before,
  after,
}: {
  locale: Locale;
  event: HistoryEvent;
  before: HistoryEvent[];
  after: HistoryEvent[];
}) {
  if (!before.length && !after.length) return null;
  const messages = getMessages(locale);
  const row = (e: HistoryEvent) => (
    <>
      <span className="w-28 shrink-0 text-sm text-muted">
        {formatWhen(e, locale)}
      </span>
      <span className="font-medium">{eventTitle(e, locale)}</span>
    </>
  );
  return (
    <>
      <h2 className="mt-10 text-xl font-bold">{messages.pages.nearbyEvents}</h2>
      <ol className="mt-3 border-s-2 border-line">
        {before.map((o) => (
          <li key={o.id}>
            <a
              href={localeHref(locale, `event/${o.id}`)}
              className="flex min-h-11 items-baseline gap-3 py-2 ps-4 hover:bg-foreground/5"
            >
              {row(o)}
            </a>
          </li>
        ))}
        <li
          aria-current="page"
          className="-ms-0.5 flex min-h-11 items-baseline gap-3 border-s-2 border-foreground bg-foreground/5 py-2 ps-4"
        >
          {row(event)}
          <span className="ms-auto shrink-0 pe-3 text-sm font-semibold">
            {messages.pages.thisEvent}
          </span>
        </li>
        {after.map((o) => (
          <li key={o.id}>
            <a
              href={localeHref(locale, `event/${o.id}`)}
              className="flex min-h-11 items-baseline gap-3 py-2 ps-4 hover:bg-foreground/5"
            >
              {row(o)}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}

/** 이 땅에 보여 줄 나라: 이 사건 무렵 앞뒤 WINDOW개씩, 나머지는 접어 둔다 */
const WINDOW = 4;

/** 이 땅을 다스린 나라: 국경 데이터의 나라 차례. 누르면 그 나라가 처음 보인 해의 지도로 */
function Lands({
  locale,
  runs,
  now,
}: {
  locale: Locale;
  runs: LandRow[];
  now: number;
}) {
  const messages = getMessages(locale);
  // 바다·작은 섬(국경 데이터에 나라가 없는 자리)도 제목은 두고 까닭을 알린다
  if (!runs.length)
    return (
      <>
        <h2 className="mt-10 text-xl font-bold">{messages.pages.landsTitle}</h2>
        <p className="mt-1 text-sm text-muted">{messages.pages.landsNone}</p>
      </>
    );
  const center = now < 0 ? runs.length - 1 : now;
  const lo = Math.max(0, center - WINDOW);
  const hi = Math.min(runs.length, center + WINDOW + 1);
  const item = (r: LandRow, i: number) => (
    <li key={i}>
      <a
        href={`${localeHref(locale)}?y=${r.from}`}
        aria-current={i === now ? "true" : undefined}
        className={`flex min-h-11 items-baseline gap-3 rounded-md px-3 py-2 hover:bg-foreground/5 ${i === now ? "bg-foreground/5 font-semibold" : ""}`}
      >
        <span className="w-36 shrink-0 text-sm text-muted">
          {r.to === null
            ? `${formatYear(r.from, locale)} –`
            : formatYearRange(r.from, r.to, locale)}
        </span>
        <span>{r.name}</span>
        {i === now && (
          <span className="ms-auto shrink-0 text-sm">
            {messages.pages.thisEvent}
          </span>
        )}
      </a>
    </li>
  );
  const more = (from: number, to: number) =>
    to > from && (
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-muted underline group-open:hidden">
          {fill(messages.pages.landsMore, { n: to - from })}
        </summary>
        <ol>{runs.slice(from, to).map((r, k) => item(r, from + k))}</ol>
      </details>
    );
  return (
    <>
      <h2 className="mt-10 text-xl font-bold">{messages.pages.landsTitle}</h2>
      <p className="mt-1 text-sm text-muted">{messages.pages.landsNote}</p>
      <div className="mt-3">
        {more(0, lo)}
        <ol>{runs.slice(lo, hi).map((r, k) => item(r, lo + k))}</ol>
        {more(hi, runs.length)}
      </div>
    </>
  );
}

/**
 * 페이지·공유 제목 "제목 (때)". 위키백과 제목에 이미 괄호가 있으면 겹치지 않게:
 * 괄호 안에 연도가 있으면("Siege of Jerusalem (587 BC)") 그대로, 아니면 "Trinity (nuclear test), 1945"
 */
function titleWithWhen(title: string, when: string): string {
  const paren = title.match(/\(([^()]*)\)$/);
  if (!paren) return `${title} (${when})`;
  return /\d{3}|\b(BC|AD|BCE|CE)\b/.test(paren[1]) ? title : `${title}, ${when}`;
}

export function eventMetadata(locale: Locale, id: string) {
  const e = findEvent(id);
  if (!e) return {};
  const messages = getMessages(locale);
  const summary = eventSummary(e, locale);
  const title = titleWithWhen(eventTitle(e, locale), formatWhen(e, locale));
  const description = clipText(summary.text);
  return {
    title: `${title} — ${messages.siteName}`,
    description,
    alternates: pageAlternates(locale, `event/${id}`),
    openGraph: {
      title,
      description,
      images: ogImage(locale, `event/${id}/og.png`),
    },
  };
}
