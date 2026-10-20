"use client";

import { useRef, type ReactNode } from "react";

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
  const half = useUi((s) => s.panelOpen && s.panelHalf);
  const setOpen = useUi((s) => s.setPanelOpen);
  const shrink = useUi((s) => s.shrinkPanel);
  const full = open && !half;
  // 머리줄 위아래로 쓸기: 위로 = 크게, 아래로 = 한 단계 작게(크게 → 절반 → 닫힘). 쓸었으면 뒤따르는 click은 버린다
  const swipe = useRef<{ y: number; done: boolean } | null>(null);
  const step = (dir: "up" | "down") => {
    if (dir === "up") setOpen(true);
    else if (full) shrink();
    else setOpen(false);
  };
  const ranked = useRankedEvents();
  const count = ranked.length;
  // 모바일에서 접혀 있을 때 맨 위 사건을 미리 보여 준다(사건 목록이 있다는 것, 누르고 싶게)
  const preview = !open ? ranked[0] : undefined;

  return (
    <section
      data-map-overlay
      aria-label={messages.ui.events}
      className={clsx(
        "pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg lg:inset-x-auto lg:end-3 lg:top-3 lg:w-[34rem] xl:w-[40rem] 2xl:w-[46rem]",
        // 모바일에서 펼치면 위 끝을 화면 25% 지점에(지도가 위에 보이게), 키 작은 기기에서도 상단 바(--top-h) 아래로.
        // 지도의 점을 탭해 열었으면 42% 지점까지만(고른 점과 카드 하나가 자세히 줄까지 한 화면에) - 머리줄을 누르면 크게
        open && !half && "max-lg:top-[max(calc(var(--top-h)+0.5rem),25dvh)]",
        // 키 작은 휴대폰(760px 미만)은 36% 지점 - 카드 하나가 연도 말풍선에 가리지 않고 다 보이게
        half &&
          "max-lg:top-[max(calc(var(--top-h)+0.5rem),42dvh)] max-lg:[@media(max-height:760px)]:top-[max(calc(var(--top-h)+0.5rem),36dvh)]",
      )}
    >
      {/* 머리줄: 누르면 크기 바꾸기(접힘·절반 → 크게, 크게 → 절반), 위 가운데 손잡이를 쓸어도 됨. 닫기는 오른쪽 X 하나 */}
      <div
        className="relative flex shrink-0 touch-none items-stretch max-lg:select-none"
        onPointerDown={(e) => {
          swipe.current = { y: e.clientY, done: false };
        }}
        onPointerMove={(e) => {
          const s = swipe.current;
          if (!s || s.done || Math.abs(e.clientY - s.y) < 24) return;
          s.done = true;
          step(e.clientY < s.y ? "up" : "down");
        }}
        onClickCapture={(e) => {
          if (swipe.current?.done) e.stopPropagation();
          swipe.current = null;
        }}
      >
        {open && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line lg:hidden"
          />
        )}
        <button
          type="button"
          onClick={() => (full ? shrink() : setOpen(true))}
          aria-expanded={full}
          aria-label={full ? messages.ui.shrinkEvents : messages.ui.openEvents}
          className={clsx(
            "flex min-w-0 flex-1 items-center justify-between gap-3 ps-5 text-lg font-bold lg:pointer-events-none lg:h-16 lg:pe-5 lg:text-2xl",
            preview ? "h-16" : "h-14",
            open ? "pe-1" : "pe-5",
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
          {!open && (
            <span aria-hidden className="text-muted lg:hidden">
              <ChevronUpIcon className="size-6" />
            </span>
          )}
        </button>
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={messages.ui.closeEvents}
            className="flex w-14 shrink-0 items-center justify-center text-muted lg:hidden"
          >
            <XIcon className="size-6" />
          </button>
        )}
      </div>
      {/* 휴대폰 절반 시트(점을 탭해 연 때)는 분류 칩을 숨겨 고른 카드 자리를 넓힌다 - 머리줄을 눌러 크게 열면 다시 보임 */}
      <div className={clsx(full ? "block" : "hidden", "lg:block")}>
        <CategoryFilter />
      </div>
      <div
        className={clsx(
          // 휴대폰은 아래 연도 말풍선이 목록 끝을 가려서, 끝까지 내렸을 때 마지막 줄(출처)이 그 위로 오게 여백
          "overflow-y-auto overscroll-contain px-3 pb-10 lg:pb-3",
          open ? "min-h-0 flex-1" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        <EventList ad={ad} />
      </div>
    </section>
  );
}
