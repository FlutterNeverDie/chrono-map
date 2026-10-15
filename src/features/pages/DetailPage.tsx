import type { ReactNode } from "react";
import type { HistoryEvent, Locale, WikiPage } from "@/lib/types";
import { fill, getMessages } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { eventTitle } from "@/lib/localize";
import { formatWhen, formatYear, formatYearRange } from "@/lib/year";
import { reportIssueUrl } from "@/data/links";
import { ExternalIcon } from "@/components/ui/icons";
import { formatPeriod, periodOf } from "@/lib/period";
import { MapChips } from "./MapChips";
import { relatedFor, type LandRow, type RelatedInput } from "./related";
import { YEAR_PERIODS, periodSlug } from "./years";

export type DetailLink = {
  href: string;
  label: string;
  /** 진한 버튼(지도에서 보기) */
  primary?: boolean;
};

/**
 * 상세 페이지 공통 틀(사건 /event/[id], 주제 지도 항목 /maps/[id]/[item], 전쟁 /wars/[id]/about).
 * 제목·정보 표·설명(위키백과 첫 문단 + 출처) → 버튼 → children(전쟁의 전투 목록 등) →
 * 이 땅의 앞뒤 사건 → 이 땅을 다스린 나라 → 광고 → 이 시기의 다른 지도 → 오류 제보.
 * 서버 컴포넌트(빌드 때 정적 HTML). 데이터는 app이 각 지도의 data에서 꺼내 넘긴다(features끼리 import하지 않음).
 */
export function DetailPage({
  locale,
  title,
  when,
  rows,
  summary,
  links,
  sources = [],
  related,
  ad,
  children,
}: {
  locale: Locale;
  title: string;
  /** 때 표시(앞뒤 사건 목록에서 이 페이지 줄) */
  when: string;
  rows: [string, string][];
  summary: { text: string; lang: Locale; page?: WikiPage };
  links: DetailLink[];
  /** 위키백과 밖 추가 출처 */
  sources?: string[];
  related: RelatedInput;
  /** 본문 아래 광고 자리(app이 features/ads의 AdSlot을 넣는다) */
  ad?: ReactNode;
  children?: ReactNode;
}) {
  const messages = getMessages(locale);
  const r = relatedFor(related, locale);
  return (
    <article>
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{title}</h1>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-base">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {summary.text && (
        <p lang={summary.lang} className="mt-8 text-lg leading-relaxed">
          {summary.text}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={
              l.primary
                ? "inline-flex h-12 items-center rounded-md bg-foreground px-5 text-base font-semibold text-background"
                : "inline-flex h-12 items-center rounded-md border border-foreground px-5 text-base font-semibold"
            }
          >
            {l.label}
          </a>
        ))}
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
      {sources.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {sources.map((url) => (
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
      {children}
      <NearbyEvents
        locale={locale}
        current={{ title, when }}
        before={r.before}
        after={r.after}
      />
      <Lands locale={locale} runs={r.lands} now={r.landNow} />
      {ad}
      <MapChips locale={locale} maps={r.maps} />
      <a
        href={reportIssueUrl(title, localeHref(locale, related.path))}
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

/** 이 땅의 앞뒤 사건: 가까운 곳의 앞 사건 → 이 페이지(강조) → 뒤 사건 */
function NearbyEvents({
  locale,
  current,
  before,
  after,
}: {
  locale: Locale;
  /** 이 페이지의 제목·때 */
  current: { title: string; when: string };
  before: HistoryEvent[];
  after: HistoryEvent[];
}) {
  if (!before.length && !after.length) return null;
  const messages = getMessages(locale);
  const row = (when: string, title: string) => (
    <>
      <span className="w-28 shrink-0 text-sm text-muted">{when}</span>
      <span className="font-medium">{title}</span>
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
              {row(formatWhen(o, locale), eventTitle(o, locale))}
            </a>
          </li>
        ))}
        <li
          aria-current="page"
          className="-ms-0.5 flex min-h-11 items-baseline gap-3 border-s-2 border-foreground bg-foreground/5 py-2 ps-4"
        >
          {row(current.when, current.title)}
          <span className="ms-auto shrink-0 pe-3 text-sm font-semibold">
            {messages.pages.thisPage}
          </span>
        </li>
        {after.map((o) => (
          <li key={o.id}>
            <a
              href={localeHref(locale, `event/${o.id}`)}
              className="flex min-h-11 items-baseline gap-3 py-2 ps-4 hover:bg-foreground/5"
            >
              {row(formatWhen(o, locale), eventTitle(o, locale))}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}

/** 이 땅에 보여 줄 나라: 이 페이지 무렵 앞뒤 WINDOW개씩, 나머지는 접어 둔다 */
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
        <span className="w-40 shrink-0 text-sm text-muted">
          {r.to === null
            ? `${formatYear(r.from, locale)} –`
            : formatYearRange(r.from, r.to, locale)}
        </span>
        <span>{r.name}</span>
        {i === now && (
          <span className="ms-auto shrink-0 text-sm">
            {messages.pages.thisPage}
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
export function titleWithWhen(title: string, when: string): string {
  const paren = title.match(/\(([^()]*)\)$/);
  if (!paren) return `${title} (${when})`;
  return /\d{3}|\b(BC|AD|BCE|CE)\b/.test(paren[1]) ? title : `${title}, ${when}`;
}


/** "○○년대 세계사" 버튼: 그 해의 연도 페이지가 있을 때만(연도 페이지는 사건이 있는 기간만 만든다) */
export function yearPageLink(locale: Locale, year: number): DetailLink[] {
  const p = periodOf(year);
  if (!YEAR_PERIODS.some((q) => q.start === p.start)) return [];
  const messages = getMessages(locale);
  return [
    {
      href: localeHref(locale, `year/${periodSlug(p)}`),
      label: fill(messages.years.title, { period: formatPeriod(p, locale) }),
    },
  ];
}
