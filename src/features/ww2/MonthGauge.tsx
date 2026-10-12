"use client";

import { useEffect, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { useWw2 } from "./store";
import { FIRST_MONTH, LAST_MONTH, formatMonth } from "./model";

const button =
  "flex size-12 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground";

/** 월 단위 게이지 (1937년 7월 ~ 1945년 9월) + 자동 재생 */
export function MonthGauge() {
  const { locale, messages } = useI18n();
  const month = useWw2((s) => s.month);
  const setMonth = useWw2((s) => s.setMonth);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const m = useWw2.getState().month;
      if (m >= LAST_MONTH) return setPlaying(false);
      setMonth(m + 1);
    }, 700);
    return () => clearInterval(t);
  }, [playing, setMonth]);

  const pct = ((month - FIRST_MONTH) / (LAST_MONTH - FIRST_MONTH)) * 100;
  const years = [1938, 1939, 1940, 1941, 1942, 1943, 1944, 1945];

  return (
    <div dir="ltr" className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={playing ? messages.ui.pause : messages.ui.play}
        onClick={() => {
          if (!playing && month >= LAST_MONTH) setMonth(FIRST_MONTH);
          setPlaying(!playing);
        }}
        className={clsx(button, playing && "bg-chip text-foreground")}
      >
        {playing ? (
          <PauseIcon className="size-5" />
        ) : (
          <PlayIcon className="size-5" />
        )}
      </button>
      <button
        type="button"
        aria-label={messages.ui.prevYear}
        onClick={() => setMonth(month - 1)}
        className={button}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
      <div className="relative min-w-0 flex-1 px-2">
        <Slider.Root
          min={FIRST_MONTH}
          max={LAST_MONTH}
          step={1}
          value={[month]}
          onValueChange={([m]) => setMonth(m)}
          className="relative flex h-12 w-full touch-none items-center select-none"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
            <Slider.Range className="absolute h-full rounded-full bg-[var(--ww2-axis)]" />
          </Slider.Track>
          <Slider.Thumb
            aria-label={messages.ui.selectYear}
            aria-valuetext={formatMonth(month, locale)}
            className="group relative flex size-12 items-center justify-center focus:outline-none"
          >
            <span className="block size-5 rounded-full border-[3px] border-[var(--ww2-axis)] bg-surface shadow-sm" />
            <span
              aria-hidden
              className={clsx(
                "pointer-events-none absolute bottom-full mb-0.5 rounded-md bg-foreground px-3 py-1.5 text-base leading-none font-bold whitespace-nowrap text-background tabular-nums",
                pct < 8
                  ? "start-1"
                  : pct > 92
                    ? "end-1"
                    : "start-1/2 -translate-x-1/2",
              )}
            >
              {formatMonth(month, locale)}
            </span>
          </Slider.Thumb>
        </Slider.Root>
        <div className="pointer-events-none absolute inset-x-2 top-full h-5 text-sm leading-none text-muted">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setMonth(y * 12)}
              className={clsx(
                "pointer-events-auto absolute top-0 -translate-x-1/2 tabular-nums",
                // 좁은 화면은 홀수 해만 (글자 겹침 방지)
                y % 2 === 0 && "hidden sm:block",
              )}
              style={{
                left: `${((y * 12 - FIRST_MONTH) / (LAST_MONTH - FIRST_MONTH)) * 100}%`,
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label={messages.ui.nextYear}
        onClick={() => setMonth(month + 1)}
        className={button}
      >
        <ChevronRightIcon className="size-6" />
      </button>
    </div>
  );
}
