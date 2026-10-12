"use client";

import { useEffect, useMemo, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { useTopic, useTopicState, useTopicStore } from "./store";
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
 * 비선형 시간 슬라이더. ◀ ▶와 재생은 "다음 항목이 등장하거나 퍼진 시점"으로 건너뛴다
 * (빈 시기를 한 달씩 넘기지 않게).
 */
export function TopicGauge() {
  const { locale, messages } = useI18n();
  const topic = useTopic();
  const store = useTopicStore();
  const t = useTopicState((s) => s.t);
  const setT = useTopicState((s) => s.setT);
  const scale = useMemo(() => topicScale(topic), [topic]);
  const frames = useMemo(() => keyframes(topic), [topic]);
  const [playing, setPlaying] = useState(false);
  const next = (from: number) => frames.find((f) => f > from);
  const prev = (from: number) => [...frames].reverse().find((f) => f < from);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const n = frames.find((f) => f > store.getState().t);
      if (n === undefined) return setPlaying(false);
      store.getState().setT(n);
    }, 1300);
    return () => clearInterval(timer);
  }, [playing, frames, store]);

  const pos = scale.toPos(t);
  return (
    <div dir="ltr" className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={playing ? messages.ui.pause : messages.ui.play}
        onClick={() => {
          if (!playing && next(t) === undefined) setT(frames[0]);
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
        onClick={() => setT(prev(t) ?? t)}
        className={button}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
      <div className="relative min-w-0 flex-1 px-2">
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
        <div className="pointer-events-none absolute inset-x-2 top-full h-5 text-sm leading-none text-muted">
          {scale.marks.map((m, i) => (
            <button
              key={m.year}
              type="button"
              onClick={() => setT(m.year * 12)}
              className={clsx(
                "pointer-events-auto absolute top-0 -translate-x-1/2 tabular-nums whitespace-nowrap",
                i === 0 && "translate-x-0",
                i === scale.marks.length - 1 && "-translate-x-full",
                i % 2 === 1 &&
                  i !== scale.marks.length - 1 &&
                  "hidden sm:block",
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
        aria-label={messages.ui.nextYear}
        onClick={() => setT(next(t) ?? t)}
        className={button}
      >
        <ChevronRightIcon className="size-6" />
      </button>
    </div>
  );
}
