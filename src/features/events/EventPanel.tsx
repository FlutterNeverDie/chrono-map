"use client";

import clsx from "clsx";
import { useUi } from "@/store/ui";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
import { EventList, useRankedEvents } from "./EventList";

/**
 * 지도 위에 떠 있는 사건 목록.
 * 모바일: 하단 게이지 위 접이식 시트 / 데스크톱(lg): 오른쪽 패널
 */
export function EventPanel() {
  const { messages } = useI18n();
  const open = useUi((s) => s.panelOpen);
  const setOpen = useUi((s) => s.setPanelOpen);
  const count = useRankedEvents().length;

  return (
    <section
      aria-label={messages.ui.events}
      className="pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg backdrop-blur lg:inset-x-auto lg:end-3 lg:top-20 lg:w-[26rem] xl:w-[30rem]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? messages.ui.closeEvents : messages.ui.openEvents}
        className="flex h-12 shrink-0 items-center justify-between px-4 text-base font-bold lg:pointer-events-none lg:h-14 lg:text-lg"
      >
        <span>
          {messages.ui.events} · {fill(messages.ui.eventCount, { n: count })}
        </span>
        <span aria-hidden className="text-muted lg:hidden">
          {open ? (
            <ChevronDownIcon className="size-5" />
          ) : (
            <ChevronUpIcon className="size-5" />
          )}
        </span>
      </button>
      <div
        className={clsx(
          "overflow-y-auto overscroll-contain px-3 pb-3",
          open ? "max-h-[55dvh]" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        <EventList />
      </div>
    </section>
  );
}
