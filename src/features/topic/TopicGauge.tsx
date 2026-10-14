"use client";

import { useMemo } from "react";
import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useTopic, useTopicState } from "./store";
import { ItemMarks } from "./ItemMarks";
import {
  MAX_POS,
  formatT,
  formatYearShort,
  keyframes,
  topicScale,
} from "./logic";

const button =
  "flex size-12 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground";

/**
 * 비선형 시간 슬라이더. ◀ ▶는 "다음 항목이 등장하거나 퍼진 시점"으로 건너뛴다
 * (빈 시기를 한 달씩 넘기지 않게).
 */
export function TopicGauge() {
  const { locale, messages } = useI18n();
  const topic = useTopic();
  const t = useTopicState((s) => s.t);
  const setT = useTopicState((s) => s.setT);
  const scale = useMemo(() => topicScale(topic), [topic]);
  const frames = useMemo(() => keyframes(topic), [topic]);
  const next = (from: number) => frames.find((f) => f > from);
  const prev = (from: number) => [...frames].reverse().find((f) => f < from);

  const pos = scale.toPos(t);
  return (
    <div dir="ltr" className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={messages.ui.prevItem}
        onClick={() => setT(prev(t) ?? t)}
        className={button}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
      <div className="relative min-w-0 flex-1 px-2">
        <ItemMarks />
        <Slider.Root
          min={0}
          max={MAX_POS}
          step={1}
          value={[pos]}
          onValueChange={([p]) => setT(scale.toT(p))}
          className="relative flex h-12 w-full touch-none items-center select-none"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
            <Slider.Range
              className="absolute h-full rounded-full"
              style={{ backgroundColor: topic.color }}
            />
          </Slider.Track>
          <Slider.Thumb
            aria-label={messages.ui.selectYear}
            aria-valuetext={formatT(t, topic, locale)}
            className="group relative flex size-12 items-center justify-center focus:outline-none"
          >
            <span
              className="block size-5 rounded-full border-[3px] bg-surface shadow-sm"
              style={{ borderColor: topic.color }}
            />
            <span
              aria-hidden
              className={clsx(
                "pointer-events-none absolute bottom-full mb-0.5 rounded-md bg-foreground px-3 py-1.5 text-base leading-none font-bold whitespace-nowrap text-background tabular-nums",
                pos < 80
                  ? "start-1"
                  : pos > 920
                    ? "end-1"
                    : "start-1/2 -translate-x-1/2",
              )}
            >
              {formatT(t, topic, locale)}
            </span>
          </Slider.Thumb>
        </Slider.Root>
        <div className="pointer-events-none absolute inset-x-2 top-[calc(100%-0.75rem)] h-5 lg:top-full text-sm leading-none text-muted">
          {scale.marks.map((m, i) => (
            <button
              key={m.year}
              type="button"
              onClick={() => setT(m.year * 12)}
              className={clsx(
                "pointer-events-auto absolute top-0 -translate-x-1/2 tabular-nums whitespace-nowrap",
                i === 0 && "translate-x-0",
                i === scale.marks.length - 1 && "-translate-x-full",
                // 좁은 화면은 처음·끝만 (오래전 연도 글자가 길어 겹침)
                i !== 0 && i !== scale.marks.length - 1 && "hidden sm:block",
              )}
              style={{ left: `${(m.pos / MAX_POS) * 100}%` }}
            >
              {m.year < 0 ? formatYearShort(m.year, locale) : m.year}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label={messages.ui.nextItem}
        onClick={() => setT(next(t) ?? t)}
        className={button}
      >
        <ChevronRightIcon className="size-6" />
      </button>
    </div>
  );
}
