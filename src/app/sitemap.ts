import type { MetadataRoute } from "next";
import { EVENTS } from "@/data/content";
import { CAMPAIGNS } from "@/features/campaign/data";
import { TOPICS } from "@/features/topic/data";
import { YEAR_PERIODS, periodSlug } from "@/features/pages";
import { LOCALES, localeHref } from "@/i18n/locales";
import { SITE_URL } from "./site";

export const dynamic = "force-static";

/** 모든 언어의 지도·전쟁 지도·연도·상세(사건·주제 지도 항목·전쟁)·소개·개인정보처리방침 등 페이지 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "wars",
    "about",
    "privacy",
    "contact",
    "guide",
    ...CAMPAIGNS.map((c) => `wars/${c.id}`),
    ...TOPICS.map((t) => `maps/${t.id}`),
    ...TOPICS.flatMap((t) => t.items.map((i) => `maps/${t.id}/${i.id}`)),
    ...CAMPAIGNS.map((c) => `wars/${c.id}/about`),
    "year",
    ...YEAR_PERIODS.map((p) => `year/${periodSlug(p)}`),
    ...EVENTS.map((e) => `event/${e.id}`),
  ];
  return paths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${localeHref(locale, path)}`,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${SITE_URL}${localeHref(l, path)}`]),
        ),
      },
    })),
  );
}
