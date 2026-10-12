"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { usePeriod } from "@/store/timeline";
import { useRankingViewpoint, useUi } from "@/store/ui";
import { isOngoing, visibleEvents } from "@/lib/events";
import { rankEvents } from "@/lib/ranking";
import { eventSummary, eventTitle, pick } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { EVENTS, RANKINGS } from "@/data/content";
import { REGION_BY_ID } from "@/data/regions";
import { VIEWPOINT_BY_ID } from "@/data/viewpoints";
import { useI18n } from "@/i18n/I18nProvider";
import { ExternalIcon, PinIcon } from "@/components/ui/icons";

/** 선택 연도 주변 사건을 현재 시점 기준 중요한 순서로 나열 */
export function useRankedEvents() {
  const period = usePeriod();
  const viewpoint = useRankingViewpoint();
  return useMemo(
    () =>
      rankEvents(visibleEvents(EVENTS, period), {
        period,
        regionOrder: VIEWPOINT_BY_ID.get(viewpoint)!.regions,
        ranking: RANKINGS[viewpoint] ?? [],
      }),
    [period, viewpoint],
  );
}

export function EventList() {
  const { locale, messages } = useI18n();
  const period = usePeriod();
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
    <ol className="space-y-3">
      {events.map((e) => {
        const region = REGION_BY_ID.get(e.region)!;
        const selected = e.id === selectedEventId;
        const summary = eventSummary(e, locale);
        const place = pick(e.place, locale);
        return (
          <li key={e.id} id={`event-${e.id}`}>
            <article
              onClick={() => selectEvent(e.id)}
              className={clsx(
                "cursor-pointer rounded-lg border bg-surface p-5 transition-colors",
                selected
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-line hover:border-muted/50",
              )}
            >
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-muted">
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
              <h3 className="mt-2 text-xl leading-snug font-bold lg:text-[22px]">
                <button
                  type="button"
                  className="text-start"
                  aria-expanded={selected}
                >
                  {eventTitle(e, locale)}
                </button>
              </h3>
              {/* 위키백과 첫 문단을 그대로 보여준다. 선택하면 전체, 아니면 4줄까지 */}
              <p
                lang={summary.lang}
                className={clsx(
                  "mt-1.5 text-base leading-relaxed text-muted lg:text-[17px]",
                  !selected && "line-clamp-4",
                )}
              >
                {summary.text}
              </p>
              {summary.page && (
                <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                  <a
                    href={summary.page.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(ev) => ev.stopPropagation()}
                    className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground"
                  >
                    {messages.ui.readMore}
                    <ExternalIcon className="size-4" />
                  </a>
                  <span>{messages.ui.wikipedia} · CC BY-SA 4.0</span>
                </p>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
