"use client";

import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useCampaign, useCampaignState } from "./store";
import { formatTime, tickYears } from "./logic";

const button =
  "flex size-12 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground";

/** 전쟁 기간 슬라이더(월 또는 연 단위) */
export function TimeGauge() {
  const { locale, messages } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const setT = useCampaignState((s) => s.setT);

  const span = c.end - c.start || 1;
  const pct = ((t - c.start) / span) * 100;
  const toT = (year: number) => (c.unit === "month" ? year * 12 : year);
  const ticks = tickYears(c);

  return (
    <div dir="ltr" className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={messages.ui.prevYear}
        onClick={() => setT(t - 1)}
        className={button}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
      <div className="relative min-w-0 flex-1 px-2">
        <Slider.Root
          min={c.start}
          max={c.end}
          step={1}
          value={[t]}
          onValueChange={([v]) => setT(v)}
          className="relative flex h-12 w-full touch-none items-center select-none"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
            <Slider.Range className="absolute h-full rounded-full bg-[var(--side-a)]" />
          </Slider.Track>
          <Slider.Thumb
            aria-label={messages.ui.selectYear}
            aria-valuetext={formatTime(t, c.unit, locale)}
            className="group relative flex size-12 items-center justify-center focus:outline-none"
          >
            <span className="block size-5 rounded-full border-[3px] border-[var(--side-a)] bg-surface shadow-sm" />
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
              {formatTime(t, c.unit, locale)}
            </span>
          </Slider.Thumb>
        </Slider.Root>
        <div className="pointer-events-none absolute inset-x-2 top-full h-5 text-sm leading-none text-muted">
          {ticks.map((y, i) => (
            <button
              key={y}
              type="button"
              onClick={() => setT(toT(y))}
              className={clsx(
                "pointer-events-auto absolute top-0 -translate-x-1/2 tabular-nums whitespace-nowrap",
                // 좁은 화면은 하나 건너 하나만 (겹침 방지)
                i % 2 === 1 && "hidden sm:block",
              )}
              style={{ left: `${((toT(y) - c.start) / span) * 100}%` }}
            >
              {y < 0 ? formatTime(y, "year", locale) : y}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label={messages.ui.nextYear}
        onClick={() => setT(t + 1)}
        className={button}
      >
        <ChevronRightIcon className="size-6" />
      </button>
    </div>
  );
}
