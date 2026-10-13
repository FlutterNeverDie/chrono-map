import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { fill, getMessages, type Messages } from "@/i18n";
import { LOCALES, localeHref } from "@/i18n/locales";
import { eventTitle } from "@/lib/localize";
import { formatPeriod, formatPeriodRange } from "@/lib/period";
import eras from "@/data/eras.json";
import { ogImage } from "@/components/og/card";
import { YEAR_PERIODS, eventCount, periodSlug, yearPage } from "./years";

/** 연도 페이지 목록 (/year): 시대(고대·중세…)별로 묶은 기간 링크 */
export function YearIndex({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const groups = eras
    .map((era, i) => ({
      era,
      periods: YEAR_PERIODS.filter(
        (p) =>
          p.start >= (i === 0 ? -Infinity : era.start) &&
          (era.end === null || p.start < era.end),
      ),
    }))
    .filter((g) => g.periods.length);

  return (
    <article>
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
        {messages.years.indexTitle}
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        {messages.years.indexDescription}
      </p>
      {groups.map(({ era, periods }) => (
        <section key={era.id} className="mt-10">
          <h2 className="text-xl font-bold">
            {messages.eras[era.id as keyof Messages["eras"]]}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {periods.map((p) => (
              <li key={p.start}>
                <a
                  href={localeHref(locale, `year/${periodSlug(p)}`)}
                  className="flex min-h-12 items-center justify-between gap-2 rounded-md border border-line px-3 py-2 hover:border-foreground/40"
                >
                  <span className="font-semibold">
                    {formatPeriod(p, locale)}
                  </span>
                  <span className="text-sm text-muted">
                    {fill(messages.years.count, { n: eventCount(p) })}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

/** 같은 화면의 언어별 주소(hreflang). 상대 경로는 레이아웃의 metadataBase로 절대 주소가 된다 */
function alternates(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localeHref(locale, path),
    languages: Object.fromEntries(LOCALES.map((l) => [l, localeHref(l, path)])),
  };
}

export function yearIndexMetadata(locale: Locale): Metadata {
  const messages = getMessages(locale);
  return {
    title: `${messages.years.indexTitle} — ${messages.siteName}`,
    description: messages.years.indexDescription,
    alternates: alternates(locale, "year"),
  };
}

export function yearMetadata(locale: Locale, slug: string): Metadata {
  const data = yearPage(slug);
  if (!data) return {};
  const messages = getMessages(locale);
  const period = formatPeriod(data.period, locale);
  const top = data.events.slice(0, 3).map((e) => eventTitle(e, locale));
  const title = fill(messages.years.title, { period });
  const description = fill(messages.years.metaDescription, {
    period,
    range: formatPeriodRange(data.period, locale),
    titles: top.join(", "),
    n: data.events.length,
  });
  return {
    title: `${title} — ${messages.siteName}`,
    description,
    alternates: alternates(locale, `year/${slug}`),
    openGraph: {
      title,
      description,
      images: ogImage(locale, `year/${slug}/og.png`),
    },
  };
}
