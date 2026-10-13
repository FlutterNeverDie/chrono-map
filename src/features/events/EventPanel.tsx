"use client";

import clsx from "clsx";
import { useUi } from "@/store/ui";
import { usePeriod } from "@/store/timeline";
import { formatPeriodRange } from "@/lib/period";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";
import { ChevronUpIcon, XIcon } from "@/components/ui/icons";
import { EventList, useRankedEvents } from "./EventList";
import { CategoryFilter } from "./CategoryFilter";
import { OtherMaps } from "./OtherMaps";

/**
 * 지도 위에 떠 있는 사건 목록.
 * 모바일: 하단 게이지 위 접이식 시트 / 데스크톱(lg): 오른쪽 패널
 */
export function EventPanel() {
  const { locale, messages } = useI18n();
  const period = usePeriod();
  const open = useUi((s) => s.panelOpen);
  const setOpen = useUi((s) => s.setPanelOpen);
  const count = useRankedEvents().length;

  return (
    <section
      data-map-overlay
      aria-label={messages.ui.events}
      className={clsx(
        "pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg backdrop-blur lg:inset-x-auto lg:end-3 lg:top-[4.5rem] lg:w-[34rem] xl:w-[40rem] 2xl:w-[46rem]",
        // 모바일에서 펼치면 위 끝을 상단 바(--top-h, 화면이 정함) 바로 아래로 — 머리줄(접기 버튼)이 가려지지 않게
        open && "max-lg:top-[calc(var(--top-h)+0.5rem)]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? messages.ui.closeEvents : messages.ui.openEvents}
        className="flex h-14 shrink-0 items-center justify-between px-5 text-lg font-bold lg:pointer-events-none lg:h-16 lg:text-2xl"
      >
        <span>
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
        <OtherMaps />
        <CategoryFilter />
      </div>
      <div
        className={clsx(
          "overflow-y-auto overscroll-contain px-3 pb-3",
          open ? "min-h-0 flex-1" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        <EventList />
        <p className="mt-4 flex gap-4 px-1 text-sm text-muted">
          <a
            href={localeHref(locale, "about")}
            className="hover:text-foreground"
          >
            {messages.pages.about}
          </a>
          <a
            href={localeHref(locale, "privacy")}
            className="hover:text-foreground"
          >
            {messages.pages.privacy}
          </a>
        </p>
      </div>
    </section>
  );
}
