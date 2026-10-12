"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { useTimeline } from "@/store/timeline";
import { useRankingViewpoint, useUi } from "@/store/ui";
import { isOngoing, visibleEvents } from "@/lib/events";
import { rankEvents } from "@/lib/ranking";
import { pick } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { EVENTS, RANKINGS } from "@/data/content";
import { REGION_BY_ID } from "@/data/regions";
import { VIEWPOINT_BY_ID } from "@/data/viewpoints";
import { useI18n } from "@/i18n/I18nProvider";
import { PinIcon } from "@/components/ui/icons";

/** 선택 연도 주변 사건을 현재 시점 기준 중요한 순서로 나열 */
export function useRankedEvents() {
  const year = useTimeline((s) => s.year);
  const viewpoint = useRankingViewpoint();
  return useMemo(
    () =>
      rankEvents(visibleEvents(EVENTS, year), {
        year,
        regionOrder: VIEWPOINT_BY_ID.get(viewpoint)!.regions,
        ranking: RANKINGS[viewpoint] ?? [],
      }),
    [year, viewpoint],
  );
}

export function EventList() {
  const { locale, messages } = useI18n();
  const year = useTimeline((s) => s.year);
  const selectedEventId = useUi((s) => s.selectedEventId);
  const selectEvent = useUi((s) => s.selectEvent);
  const events = useRankedEvents();

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
    <ol className="space-y-2.5">
      {events.map((e) => {
        const region = REGION_BY_ID.get(e.region)!;
        return (
          <li key={e.id} id={`event-${e.id}`}>
            <button
              type="button"
              onClick={() => selectEvent(e.id)}
              className={clsx(
                "w-full rounded-lg border bg-surface p-4 text-start transition-colors hover:border-muted/50",
                e.id === selectedEventId
                  ? "border-accent ring-2 ring-accent/40"
                  : "border-line",
              )}
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: region.color }}
                  />
                  {messages.regions[e.region]}
                </span>
                <span>{formatWhen(e, locale)}</span>
                {isOngoing(e, year) && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                    {messages.ui.ongoing}
                  </span>
                )}
              </p>
              <p className="mt-1.5 text-lg leading-snug font-bold">
                {pick(e.title, locale)}
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                {pick(e.summary, locale)}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-sm text-muted">
                <PinIcon className="size-3.5 shrink-0" />
                {pick(e.place, locale)}
              </p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
