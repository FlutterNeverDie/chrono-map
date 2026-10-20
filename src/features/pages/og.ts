import { readFileSync } from "node:fs";
import { join } from "node:path";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { HistoryEvent, Locale } from "@/lib/types";
import { parseThreadPosts, type ThreadPost } from "@/lib/threadPosts";
import { polityColor } from "@/components/map/polityColor";
import type { PolityProps } from "@/components/map/borders";
import type { PostCard } from "@/components/og/renderPost";
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

/** 스레드 글(content/threads/posts.en.txt) - 이미지 글자와 본문. 영어만 */
let threadPosts: Map<string, ThreadPost> | null = null;
export function threadPostsEn(): Map<string, ThreadPost> {
  threadPosts ??= parseThreadPosts(
    readFileSync(join(process.cwd(), "content/threads/posts.en.txt"), "utf8"),
  );
  return threadPosts;
}

/** 그 해(이하 가장 가까운) 본 지도 국경 스냅샷의 나라들 - public/borders */
function bordersOf(year: number) {
  const dir = join(process.cwd(), "public/borders");
  const years = JSON.parse(
    readFileSync(join(dir, "index.json"), "utf8"),
  ) as number[];
  const snap = years.filter((y) => y <= year).at(-1) ?? years[0];
  const topo = JSON.parse(
    readFileSync(join(dir, `${snap}.json`), "utf8"),
  ) as Topology<{ p: GeometryCollection<PolityProps> }>;
  return feature(topo, topo.objects.p).features.filter(
    // 방향이 뒤집힌 도형은 지도 전체를 칠한다(components/map/borders.ts와 같은 검사)
    (f) => geoArea(f) < 2 * Math.PI,
  ) as Feature<Polygon | MultiPolygon, PolityProps>[];
}
let polityNamesEn: Record<string, string> | null = null;

/** 스레드 글 이미지(4:5): 그 해 국경 지도 + 큰 한 줄. 글이 없는 사건은 null */
export function eventPostCard(id: string): PostCard | null {
  const e = findEvent(id);
  const post = threadPostsEn().get(id);
  if (!e || !post) return null;
  const m = getMessages("en");
  polityNamesEn ??= JSON.parse(
    readFileSync(join(process.cwd(), "public/borders/names/en.json"), "utf8"),
  ) as Record<string, string>;
  const names = polityNamesEn;
  return {
    kicker: formatWhen(e, "en"),
    head: post.head,
    sub: post.sub,
    title: eventTitle(e, "en"),
    brand: m.siteName,
    credit: "Borders: Cliopatria (CC BY 4.0)",
    pin: e.coords,
    // 중요도 5(세계적인 사건)는 대륙이 보이게 넓게
    span: e.importance >= 5 ? 90 : 40,
    regions: bordersOf(Number(e.start)).map((f) => ({
      shape: f,
      color: polityColor(f.properties.n),
      label:
        f.properties.l && !f.properties.n.startsWith("(")
          ? {
              text: names[f.properties.n] ?? f.properties.n,
              at: f.properties.l,
              area: f.properties.a,
            }
          : undefined,
    })),
  };
}
