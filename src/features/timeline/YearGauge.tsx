"use client";

import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { usePeriod, useTimeline } from "@/store/timeline";
import {
  MAX_POSITION,
  MIN_POSITION,
  MIN_YEAR,
  positionToYear,
  yearToPosition,
} from "@/lib/timeScale";
import { formatPeriod, stepPeriod } from "@/lib/period";
import eras from "@/data/eras.json";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n";

const stepButton =
  "flex size-12 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground active:bg-chip";

/** 연도 게이지: 남는 가로폭을 모두 쓴다 (모바일·데스크톱 공통) */
export function YearGauge({ className }: { className?: string }) {
  const { locale, messages } = useI18n();
  const year = useTimeline((s) => s.year);
  const setYear = useTimeline((s) => s.setYear);
  const currentEra = eras.findLast((e) => year >= e.start);

  const period = usePeriod();
  const label = formatPeriod(period, locale);
  const position = yearToPosition(period.start);
  const step = (direction: 1 | -1) =>
    setYear(stepPeriod(period, direction).start);

  return (
    // 아랍어(RTL)에서도 시간 축은 왼쪽(과거) → 오른쪽(현재)
    <div
      dir="ltr"
      className={clsx("flex min-w-0 items-center gap-1", className)}
    >
      <button
        type="button"
        aria-label={messages.ui.prevYear}
        onClick={() => step(-1)}
        className={stepButton}
      >
        <ChevronLeftIcon className="size-6" />
      </button>

      <div className="relative min-w-0 flex-1 px-2">
        <Slider.Root
          min={MIN_POSITION}
          max={MAX_POSITION}
          step={1}
          value={[position]}
          onValueChange={([p]) => setYear(positionToYear(p))}
          className="relative flex h-12 w-full touch-none items-center select-none"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
            <Slider.Range className="absolute h-full rounded-full bg-accent" />
          </Slider.Track>
          {/* 보이는 손잡이는 작게, 터치 영역은 44px */}
          <Slider.Thumb
            aria-label={messages.ui.selectYear}
            aria-valuetext={label}
            className="group relative flex size-12 items-center justify-center focus:outline-none"
          >
            <span className="block size-5 rounded-full border-[3px] border-accent bg-surface shadow-sm transition-transform group-focus-visible:ring-4 group-focus-visible:ring-accent/30 group-active:scale-110" />
            {/* 현재 기간: 손잡이 바로 위. 양 끝에서는 화면 밖으로 나가지 않게 한쪽으로 붙인다 */}
            <span
              aria-hidden
              className={clsx(
                "pointer-events-none absolute bottom-full mb-0.5 rounded-md bg-foreground px-3 py-1.5 text-base leading-none font-bold whitespace-nowrap text-background tabular-nums",
                position < 80
                  ? "start-1"
                  : position > 920
                    ? "end-1"
                    : "start-1/2 -translate-x-1/2",
              )}
            >
              {label}
            </span>
          </Slider.Thumb>
        </Slider.Root>

        {/* 시대 눈금 (F-03): 누르면 그 시대 시작으로 이동. 좁은 화면은 현재 시대 이름만 */}
        <div className="pointer-events-none absolute inset-x-2 top-full h-5 text-sm leading-none text-muted">
          {eras.map((era) => {
            const current = era.id === currentEra?.id;
            const left = (yearToPosition(era.start) / MAX_POSITION) * 100;
            return (
              <button
                key={era.id}
                type="button"
                onClick={() => setYear(Math.max(MIN_YEAR, era.start))}
                className="pointer-events-auto absolute top-0 -translate-x-px ps-1.5 whitespace-nowrap"
                style={{ left: `${left}%` }}
              >
                <span
                  aria-hidden
                  className="absolute start-0 -top-1 h-2.5 w-px bg-line"
                />
                <span
                  className={clsx(
                    current
                      ? "font-semibold text-foreground"
                      : "sr-only sm:not-sr-only",
                  )}
                >
                  {messages.eras[era.id as keyof Messages["eras"]]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label={messages.ui.nextYear}
        onClick={() => step(1)}
        className={stepButton}
      >
        <ChevronRightIcon className="size-6" />
      </button>
    </div>
  );
}
