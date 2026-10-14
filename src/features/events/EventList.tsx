"use client";

import type { ReactNode } from "react";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { usePeriod } from "@/store/timeline";
import { useRankingViewpoint, useUi } from "@/store/ui";
import { isOngoing } from "@/lib/events";
import { useVisibleEvents } from "@/store/useVisibleEvents";
import { useRankings } from "@/store/events";
import { rankEvents } from "@/lib/ranking";
import { eventSummary, eventTitle, pick } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { REGION_BY_ID } from "@/data/regions";
import { VIEWPOINT_BY_ID } from "@/data/viewpoints";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";
import { PinIcon, ChevronRightIcon } from "@/components/ui/icons";
import { WikiLink } from "@/components/ui/WikiLink";
import { withAd } from "@/components/ui/withAd";
import { ExpandableText } from "@/components/ui/ExpandableText";

/** 사건 카드를 한 번에 그리는 수 */
const PAGE = 20;

/** 선택 연도 주변 사건을 현재 시점 기준 중요한 순서로 나열 */
export function useRankedEvents() {
  const period = usePeriod();
  const visible = useVisibleEvents();
  const viewpoint = useRankingViewpoint();
  const rankings = useRankings();
  return useMemo(
    () =>
      rankEvents(visible, {
        period,
        regionOrder: VIEWPOINT_BY_ID.get(viewpoint)!.regions,
        ranking: rankings[viewpoint] ?? [],
      }),
    [visible, period, viewpoint, rankings],
  );
}

/** ad: 카드 사이에 넣을 광고(3번째 뒤) — app이 features/ads의 AdSlot을 넘긴다 */
export function EventList({ ad }: { ad?: ReactNode } = {}) {
  const { locale, messages } = useI18n();
  const period = usePeriod();
  const selectedEventId = useUi((s) => s.selectedEventId);
  const selectEvent = useUi((s) => s.selectEvent);
  const focusOn = useUi((s) => s.focusOn);
  const events = useRankedEvents();
  // 한 번에 그리는 카드 수 제한 — "더 보기"로 늘린다. 기간이 바뀌면 처음으로
  const [limit, setLimit] = useState({ key: period.start, n: PAGE });
  const shown = limit.key === period.start ? limit.n : PAGE;
  const selectedIndex = events.findIndex((e) => e.id === selectedEventId);
  const count = Math.max(shown, selectedIndex + 1);

  // 지도에서 핀을 고르면 해당 카드로 스크롤
  useEffect(() => {
    if (!selectedEventId) return;
    document
      .getElementById(`event-${selectedEventId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedEventId]);

  if (events.length === 0) {
    return (
      <p className="px-1 py-2 text-base text-muted">{messages.ui.noEvents}</p>
    );
  }

  return (
    <>
      <ol className="space-y-3">
        {withAd(
          events.slice(0, count).map((e) => {
            const region = REGION_BY_ID.get(e.region)!;
            const selected = e.id === selectedEventId;
            const summary = eventSummary(e, locale);
            const place = pick(e.place, locale);
            return (
              <li key={e.id} id={`event-${e.id}`}>
                <article
                  onClick={() => {
                    selectEvent(e.id);
                    focusOn(e.coords);
                  }}
                  className={clsx(
                    "cursor-pointer rounded-lg border bg-surface p-5 transition-colors",
                    selected
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-line hover:border-muted/50",
                  )}
                >
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-muted lg:text-base">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <span
                        aria-hidden
                        className="size-3 rounded-full"
                        style={{ backgroundColor: region.color }}
                      />
                      {messages.regions[e.region]}
                    </span>
                    <span>{formatWhen(e, locale)}</span>
                    {place && (
                      <span className="inline-flex items-center gap-0.5">
                        <PinIcon className="size-4 shrink-0" />
                        {place}
                      </span>
                    )}
                    {isOngoing(e, period) && (
                      <span className="rounded bg-accent/12 px-2 py-0.5 text-[13px] font-semibold text-accent">
                        {messages.ui.ongoing}
                      </span>
                    )}
                  </p>
                  <h3 className="mt-2 text-xl leading-snug font-bold lg:text-2xl xl:text-[26px]">
                    <button
                      type="button"
                      className="text-start"
                      aria-expanded={selected}
                    >
                      {eventTitle(e, locale)}
                    </button>
                  </h3>
                  {/* 위키백과 첫 문단을 그대로 보여준다. 4줄까지 접어 두고 "자세히"로 그 자리에서 펼친다 */}
                  <ExpandableText
                    text={summary.text}
                    lang={summary.lang}
                    moreLabel={messages.ui.details}
                    lessLabel={messages.ui.collapse}
                    className="mt-2 text-base text-muted lg:text-lg xl:text-[19px]"
                    expanded={
                      // 끝까지 읽은 사람에게만: 사건 상세 페이지(글 + 본문 광고)로
                      <a
                        href={localeHref(locale, `event/${e.id}`)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-foreground hover:underline lg:text-[15px]"
                      >
                        {messages.ui.eventPage}
                        <ChevronRightIcon className="size-4 rtl:rotate-180" />
                      </a>
                    }
                    trailing={
                      summary.page && (
                        <WikiLink
                          href={summary.page.url}
                          label={messages.ui.readMore}
                          source={`${messages.ui.wikipedia} · CC BY-SA 4.0`}
                        />
                      )
                    }
                  />
                  {e.campaign && (
                    <a
                      href={localeHref(locale, `wars/${e.campaign}`)}
                      onClick={(ev) => ev.stopPropagation()}
                      className="mt-2 inline-flex h-10 items-center rounded-md bg-foreground px-3 text-sm font-semibold text-background lg:text-[15px]"
                    >
                      {messages.wars.openMap}
                    </a>
                  )}
                </article>
              </li>
            );
          }),
          ad,
        )}
      </ol>
      {events.length > count && (
        <button
          type="button"
          onClick={() => setLimit({ key: period.start, n: count + PAGE })}
          className="mt-3 h-11 w-full rounded-lg border border-line text-base font-medium text-muted hover:bg-chip hover:text-foreground"
        >
          {messages.ui.showMore} · {events.length - count}
        </button>
      )}
    </>
  );
}
