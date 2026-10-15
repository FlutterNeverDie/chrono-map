import type { ReactNode } from "react";
import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { pageAlternates } from "@/i18n/alternates";
import { clipText, eventTitle, pick } from "@/lib/localize";
import { EVENTS } from "@/data/content";
import { ExternalIcon } from "@/components/ui/icons";
import {
  DetailPage,
  titleWithWhen,
  yearPageLink,
  type DetailLink,
} from "@/features/pages";
import {
  formatItemWhen,
  itemSummary,
  itemTitle,
  topicTitle,
} from "@/features/topic";
import { TOPICS, findTopic } from "@/features/topic/data";
import {
  battleSummary,
  battleTitle,
  campaignSummary,
  campaignTitle,
  formatRange,
} from "@/features/campaign";
import { CAMPAIGNS, findCampaign } from "@/features/campaign/data";

/**
 * 주제 지도 항목·전쟁의 상세 페이지 조립(서버 전용). 지도 기능끼리는 서로 모르므로
 * 각 지도의 데이터·글 함수를 여기서 꺼내 공통 틀(features/pages의 DetailPage)에 넘긴다.
 * - 주제 지도 항목: /maps/[id]/[item] (지도 카드 "상세 페이지로")
 * - 전쟁: /wars/[id]/about - 전쟁 설명 + 전투 전체(전투마다 #battle-<id>, 전투 카드 "상세 페이지로"가 여기로)
 *   전투마다 페이지를 만들면 2,600여 개 × 8개 언어로 Cloudflare 정적 파일 한도(2만 개)를 넘는다.
 */

const yearOfMonth = (t: number) => Math.floor(t / 12);

export const topicItemParams = () =>
  TOPICS.flatMap((t) => t.items.map((i) => ({ id: t.id, item: i.id })));

function findItem(topicId: string, itemId: string) {
  const topic = findTopic(topicId);
  const item = topic?.items.find((i) => i.id === itemId);
  return topic && item ? { topic, item } : null;
}
export const hasTopicItem = (topicId: string, itemId: string) =>
  findItem(topicId, itemId) !== null;

export function TopicItemDetail({
  locale,
  topicId,
  itemId,
  ad,
}: {
  locale: Locale;
  topicId: string;
  itemId: string;
  ad?: ReactNode;
}) {
  const found = findItem(topicId, itemId);
  if (!found) return null;
  const { topic, item } = found;
  const m = getMessages(locale);
  const when = formatItemWhen(item, topic, locale);
  const mapPath = `maps/${topic.id}?item=${item.id}`;
  const links: DetailLink[] = [
    {
      href: localeHref(locale, mapPath),
      label: m.pages.backToMap,
      primary: true,
    },
    ...yearPageLink(locale, yearOfMonth(item.start)),
  ];
  return (
    <DetailPage
      locale={locale}
      title={itemTitle(item, locale)}
      when={when}
      rows={[
        [m.pages.period, when],
        [m.pages.map, topicTitle(topic, locale)],
      ]}
      summary={itemSummary(item, locale)}
      links={links}
      related={{
        path: `maps/${topic.id}/${item.id}`,
        coords: item.coords,
        start: yearOfMonth(item.start),
        end: yearOfMonth(item.end),
        mapPath,
      }}
      ad={ad}
    />
  );
}

export function topicItemMetadata(
  locale: Locale,
  topicId: string,
  itemId: string,
) {
  const found = findItem(topicId, itemId);
  if (!found) return {};
  const { topic, item } = found;
  const m = getMessages(locale);
  const title = titleWithWhen(
    itemTitle(item, locale),
    formatItemWhen(item, topic, locale),
  );
  return {
    title: `${title} — ${topicTitle(topic, locale)} · ${m.siteName}`,
    description: clipText(
      itemSummary(item, locale).text || pick(topic.description, locale),
    ),
    alternates: pageAlternates(locale, `maps/${topic.id}/${item.id}`),
  };
}

export const warParams = () => CAMPAIGNS.map((c) => ({ id: c.id }));

export function WarDetail({
  locale,
  id,
  ad,
}: {
  locale: Locale;
  id: string;
  ad?: ReactNode;
}) {
  const c = findCampaign(id);
  if (!c) return null;
  const m = getMessages(locale);
  const when = formatRange(c.start, c.end, c.unit, locale);
  const sides = (["a", "b"] as const)
    .map((k) => c.sides[k] && pick(c.sides[k], locale))
    .filter(Boolean);
  // 같은 위키백과 문서의 본 지도 사건(있으면 그 사건 상세로도)
  const event = EVENTS.find((e) => e.campaign === c.id);
  const links: DetailLink[] = [
    {
      href: localeHref(locale, `wars/${c.id}`),
      label: m.wars.openMap,
      primary: true,
    },
    ...yearPageLink(locale, c.startYear),
    ...(event
      ? [
          {
            href: localeHref(locale, `event/${event.id}`),
            label: eventTitle(event, locale),
          },
        ]
      : []),
  ];
  const battles = [...c.battles].sort(
    (a, b) => a.start - b.start || b.links - a.links,
  );
  const top = [...c.battles].sort((a, b) => b.links - a.links)[0];
  return (
    <DetailPage
      locale={locale}
      title={campaignTitle(c, locale)}
      when={when}
      rows={[
        [m.pages.period, when],
        ...(sides.length === 2
          ? ([[m.pages.sides, sides.join(" vs ")]] as [string, string][])
          : []),
        [m.wars.battles, String(c.battles.length)],
      ]}
      summary={campaignSummary(c, locale)}
      links={links}
      related={{
        path: `wars/${c.id}`,
        // 이 전쟁의 자리 = 가장 중요한 전투의 자리(scripts/build-lands.ts와 같은 기준)
        coords: top?.coords ?? [c.view.lon, c.view.lat],
        start: c.startYear,
        end: c.endYear,
        eventId: event?.id,
        mapPath: `wars/${c.id}`,
      }}
      ad={ad}
    >
      {battles.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-bold">
            {m.wars.battles}{" "}
            <span className="text-base font-medium text-muted">
              {battles.length}
            </span>
          </h2>
          <ol className="mt-4 space-y-3">
            {battles.map((b) => {
              const summary = battleSummary(b, locale);
              return (
                <li
                  key={b.id}
                  id={`battle-${b.id}`}
                  className="scroll-mt-20 rounded-lg border border-line p-4 target:border-accent target:ring-2 target:ring-accent/30"
                >
                  <p className="text-sm text-muted">
                    {formatRange(b.start, b.end, c.unit, locale)}
                  </p>
                  <h3 className="mt-1 text-lg leading-snug font-semibold">
                    {battleTitle(b, locale)}
                  </h3>
                  {summary.text && (
                    <p
                      lang={summary.lang}
                      className="mt-1.5 text-base leading-relaxed"
                    >
                      {summary.text}
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 text-sm">
                    <a
                      href={localeHref(locale, `wars/${c.id}?battle=${b.id}`)}
                      className="inline-flex min-h-11 items-center font-semibold underline"
                    >
                      {m.pages.backToMap}
                    </a>
                    {summary.page && (
                      <a
                        href={summary.page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-muted underline"
                      >
                        {m.ui.wikipedia} · CC BY-SA 4.0
                        <ExternalIcon className="size-3.5" />
                      </a>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </DetailPage>
  );
}

export function warDetailMetadata(locale: Locale, id: string) {
  const c = findCampaign(id);
  if (!c) return {};
  const m = getMessages(locale);
  const title = titleWithWhen(
    campaignTitle(c, locale),
    formatRange(c.start, c.end, c.unit, locale),
  );
  return {
    title: `${title} — ${m.wars.tab} · ${m.siteName}`,
    description: clipText(
      campaignSummary(c, locale).text || m.wars.indexDescription,
    ),
    alternates: pageAlternates(locale, `wars/${c.id}/about`),
  };
}
