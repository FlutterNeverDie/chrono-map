"use client";

import type { ReactNode } from "react";

import clsx from "clsx";
import { useUi } from "@/store/ui";
import { usePeriod } from "@/store/timeline";
import { formatPeriodRange } from "@/lib/period";
import { eventTitle } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronUpIcon, XIcon } from "@/components/ui/icons";
import { EventList, useRankedEvents } from "./EventList";
import { CategoryFilter } from "./CategoryFilter";
import { useEventUrl } from "./useEventUrl";

/**
 * 지도 위에 떠 있는 사건 목록.
 * 모바일: 하단 게이지 위 접이식 시트 / 데스크톱(lg): 오른쪽 패널
 */
/** ad: 사건 카드 사이 광고(app이 넘김) */
export function EventPanel({ ad }: { ad?: ReactNode } = {}) {
  const { locale, messages } = useI18n();
  useEventUrl();
  const period = usePeriod();
  const open = useUi((s) => s.panelOpen);
  const setOpen = useUi((s) => s.setPanelOpen);
  const ranked = useRankedEvents();
  const count = ranked.length;
  // 모바일에서 접혀 있을 때 맨 위 사건을 미리 보여 준다(사건 목록이 있다는 것, 누르고 싶게)
  const preview = !open ? ranked[0] : undefined;

  return (
    <section
      data-map-overlay
      aria-label={messages.ui.events}
      className={clsx(
        "pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg backdrop-blur lg:inset-x-auto lg:end-3 lg:top-3 lg:w-[34rem] xl:w-[40rem] 2xl:w-[46rem]",
        // 모바일에서 펼치면 위 끝을 화면 25% 지점에(지도가 위에 보이게), 키 작은 기기에서도 상단 바(--top-h) 아래로
        open && "max-lg:top-[max(calc(var(--top-h)+0.5rem),25dvh)]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? messages.ui.closeEvents : messages.ui.openEvents}
        className={clsx(
          "flex shrink-0 items-center justify-between gap-3 px-5 text-lg font-bold lg:pointer-events-none lg:h-16 lg:text-2xl",
          preview ? "h-16" : "h-14",
        )}
      >
        {preview && (
          <span className="flex min-w-0 flex-col items-start lg:hidden">
            <span className="text-sm font-medium text-muted">
              {messages.ui.events} ·{" "}
              {fill(messages.ui.eventCount, { n: count })} ·{" "}
              {formatPeriodRange(period, locale)}
            </span>
            <span className="w-full truncate text-start text-base">
              {eventTitle(preview, locale)}
              <span className="ms-2 text-sm font-medium text-muted">
                {formatWhen(preview, locale)}
              </span>
            </span>
          </span>
        )}
        <span className={clsx(preview && "max-lg:hidden")}>
          {messages.ui.events} · {fill(messages.ui.eventCount, { n: count })}
          <span className="ms-2 text-base font-medium text-muted lg:text-xl">
            {formatPeriodRange(period, locale)}
          </span>
        </span>
        <span aria-hidden className="text-muted lg:hidden">
          {open ? (
            <XIcon className="size-6" />
          ) : (
            <ChevronUpIcon className="size-6" />
          )}
        </span>
      </button>
      <div className={clsx(open ? "block" : "hidden", "lg:block")}>
        <CategoryFilter />
      </div>
      <div
        className={clsx(
          "overflow-y-auto overscroll-contain px-3 pb-3",
          open ? "min-h-0 flex-1" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        <EventList ad={ad} />
      </div>
    </section>
  );
}
