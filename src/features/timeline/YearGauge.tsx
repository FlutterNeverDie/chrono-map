"use client";

import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { useTimeline } from "@/store/timeline";
import {
  MAX_POSITION,
  MAX_YEAR,
  MIN_POSITION,
  MIN_YEAR,
  positionToYear,
  yearToPosition,
} from "@/lib/timeScale";
import { formatYear } from "@/lib/year";
import eras from "@/data/eras.json";

type Props = { orientation: "horizontal" | "vertical"; className?: string };

export function YearGauge({ orientation, className }: Props) {
  const year = useTimeline((s) => s.year);
  const setYear = useTimeline((s) => s.setYear);
  const vertical = orientation === "vertical";

  const step = (delta: number) => {
    let next = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year + delta));
    if (next === 0) next = delta > 0 ? 1 : -1; // 0년 건너뛰기
    setYear(next);
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-2",
        vertical ? "h-full flex-col-reverse" : "w-full",
        className,
      )}
    >
      <button
        type="button"
        aria-label="1년 전"
        onClick={() => step(-1)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg dark:bg-neutral-800"
      >
        {vertical ? "▼" : "◀"}
      </button>

      <div className={clsx("relative flex-1", vertical ? "w-full" : "h-full")}>
        <Slider.Root
          orientation={orientation}
          min={MIN_POSITION}
          max={MAX_POSITION}
          step={1}
          value={[yearToPosition(year)]}
          onValueChange={([p]) => setYear(positionToYear(p))}
          className={clsx(
            "relative flex touch-none select-none items-center",
            vertical ? "mx-auto h-full w-11 flex-col" : "h-11 w-full",
          )}
        >
          <Slider.Track
            className={clsx(
              "relative grow rounded-full bg-neutral-200 dark:bg-neutral-700",
              vertical ? "w-1.5" : "h-1.5",
            )}
          >
            <Slider.Range className="absolute rounded-full bg-amber-500" />
          </Slider.Track>
          <Slider.Thumb
            aria-label="연도 선택"
            aria-valuetext={formatYear(year)}
            className="block size-7 rounded-full border-4 border-amber-500 bg-white shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          />
        </Slider.Root>

        {/* 시대 레이블 (F-03) */}
        <div
          className={clsx(
            "pointer-events-none absolute text-[11px] text-neutral-500",
            vertical ? "inset-y-0 left-full ml-1" : "inset-x-0 top-full",
          )}
        >
          {eras.map((era) => {
            const at = (yearToPosition(era.start) / MAX_POSITION) * 100;
            return (
              <span
                key={era.id}
                className="absolute whitespace-nowrap"
                style={vertical ? { bottom: `${at}%` } : { left: `${at}%` }}
              >
                {era.name}
              </span>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label="1년 후"
        onClick={() => step(1)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg dark:bg-neutral-800"
      >
        {vertical ? "▲" : "▶"}
      </button>
    </div>
  );
}
