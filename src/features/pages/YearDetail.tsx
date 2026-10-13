import type { HistoryEvent, Locale } from "@/lib/types";
import { fill, getMessages } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { eventSummary, eventTitle, pick } from "@/lib/localize";
import { formatPeriod, formatPeriodRange, type Period } from "@/lib/period";
import { formatWhen } from "@/lib/year";
import { MAP_LANES } from "@/data/mapMarkers";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalIcon,
} from "@/components/ui/icons";
import { reportIssueUrl } from "@/data/links";
import { periodSlug, yearPage } from "./years";

/** 연도 페이지 (/year/[slug]). 그 기간에 시작한 사건 + 이어지는 일 + 다른 지도 + 앞뒤 기간 */
export function YearDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const data = yearPage(slug);
  if (!data) return null;
  const { period, events, ongoing, nearby, maps, prev, next } = data;
  const messages = getMessages(locale);
  const t = messages.years;
  const lane = (id: string) => MAP_LANES.find((l) => l.id === id)!;

  return (
    <article>
      <a
        href={localeHref(locale, "year")}
        className="text-sm font-medium text-muted hover:text-foreground"
      >
        {t.all}
      </a>
      <h1 className="mt-2 text-3xl leading-tight font-bold sm:text-4xl">
        {fill(t.title, { period: formatPeriod(period, locale) })}
      </h1>
      <p className="mt-2 text-lg text-muted">
        {formatPeriodRange(period, locale)}
      </p>
      <a
        href={`${localeHref(locale)}?y=${period.start}`}
        className="mt-6 inline-flex h-12 items-center rounded-md bg-foreground px-5 text-base font-semibold text-background"
      >
        {messages.pages.backToMap}
      </a>

      <h2 className="mt-10 text-xl font-bold">
        {t.events}{" "}
        <span className="text-base font-medium text-muted">
          {fill(t.count, { n: events.length })}
        </span>
      </h2>
      <ol className="mt-4 space-y-3">
        {events.map((e) => {
          const summary = eventSummary(e, locale);
          return (
            <li key={e.id}>
              <a
                href={localeHref(locale, `event/${e.id}`)}
                className="block rounded-lg border border-line p-4 hover:border-foreground/40"
              >
                <p className="text-sm text-muted">
                  {formatWhen(e, locale)} · {messages.regions[e.region]} ·{" "}
                  {messages.categories[e.category]}
                </p>
                <h3 className="mt-1 text-lg leading-snug font-semibold">
                  {eventTitle(e, locale)}
                </h3>
                {/* 위키백과 글은 자르지 않고 그대로 넣고, 화면에서만 3줄로 줄여 보인다 */}
                <p
                  lang={summary.lang}
                  className="mt-1.5 line-clamp-3 text-base leading-relaxed"
                >
                  {summary.text}
                </p>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm text-muted">{t.note}</p>

      <EventChips locale={locale} title={t.ongoing} events={ongoing} />
      <EventChips locale={locale} title={t.nearby} events={nearby} />

      {maps.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-bold">{messages.ui.otherMaps}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {maps.map((m) => {
              const l = lane(m.lane);
              return (
                <li key={m.key}>
                  <a
                    href={localeHref(locale, m.path)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 py-1.5 text-base hover:border-foreground/40"
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="text-muted">
                      {l.titles ? pick(l.titles, locale) : messages.wars.tab}
                    </span>
                    <span className="font-semibold">
                      {pick(m.titles, locale) || m.fallback}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <a
        href={reportIssueUrl(
          formatPeriod(period, locale),
          localeHref(locale, `year/${periodSlug(period)}`),
        )}
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted underline hover:text-foreground"
      >
        {messages.pages.report}
        <ExternalIcon className="size-3.5" />
      </a>

      <nav className="mt-12 grid grid-cols-2 gap-3">
        {prev ? (
          <PeriodLink
            locale={locale}
            period={prev}
            label={t.prev}
            side="prev"
          />
        ) : (
          <span />
        )}
        {next && (
          <PeriodLink
            locale={locale}
            period={next}
            label={t.next}
            side="next"
          />
        )}
      </nav>
    </article>
  );
}

/** 이어지는 일·같은 무렵: 제목과 때만 보이는 작은 링크 목록 */
function EventChips({
  locale,
  title,
  events,
}: {
  locale: Locale;
  title: string;
  events: HistoryEvent[];
}) {
  if (!events.length) return null;
  return (
    <>
      <h2 className="mt-10 text-xl font-bold">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {events.map((e) => (
          <li key={e.id}>
            <a
              href={localeHref(locale, `event/${e.id}`)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 py-1.5 text-base hover:border-foreground/40"
            >
              <span className="font-medium">{eventTitle(e, locale)}</span>
              <span className="text-sm text-muted">
                {formatWhen(e, locale)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function PeriodLink({
  locale,
  period,
  label,
  side,
}: {
  locale: Locale;
  period: Period;
  label: string;
  side: "prev" | "next";
}) {
  const Icon = side === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <a
      href={localeHref(locale, `year/${periodSlug(period)}`)}
      rel={side}
      className={`flex min-h-16 items-center gap-2 rounded-lg border border-line px-3 py-2 hover:border-foreground/40 ${side === "next" ? "flex-row-reverse text-end" : ""}`}
    >
      <Icon className="size-5 shrink-0 text-muted rtl:-scale-x-100" />
      <span>
        <span className="block text-sm text-muted">{label}</span>
        <span className="block font-semibold">
          {formatPeriod(period, locale)}
        </span>
      </span>
    </a>
  );
}
