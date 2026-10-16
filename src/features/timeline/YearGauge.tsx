"use client";

import { useEffect, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { usePeriod, useTimeline } from "@/store/timeline";
import { MAX_POSITION, MIN_POSITION } from "@/lib/timeScale";
import { MIN_YEAR, TIME_SCALE } from "@/data/timeline";

const { positionToYear, yearToPosition } = TIME_SCALE;
import { formatPeriod, stepPeriod } from "@/lib/period";
import eras from "@/data/eras.json";
import { MapLanes } from "./MapLanes";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";
import { useYearUrl } from "./useYearUrl";
import { useSavedYearStep } from "./YearStepSetting";
import type { Messages } from "@/i18n";

const stepButton =
  "flex size-12 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground active:bg-chip";

/** 글자 폭 어림(em): 한중일 글자 1, 그 밖 0.6 + 여백 */
const eraLabelEm = (text: string) =>
  [...text].reduce((w, ch) => w + (ch.codePointAt(0)! >= 0x2e80 ? 1 : 0.6), 0) +
  0.6;

/** 연도 게이지: 남는 가로폭을 모두 쓴다 (모바일·데스크톱 공통) */
export function YearGauge({ className }: { className?: string }) {
  const { locale, messages } = useI18n();
  const year = useTimeline((s) => s.year);
  const setYear = useTimeline((s) => s.setYear);
  const currentEra = eras.findLast((e) => year >= e.start);

  // 저장된 연도 단위를 주소의 연도보다 먼저 적용(효과는 선언 순서대로 실행)
  useSavedYearStep();
  useYearUrl();
  const period = usePeriod();
  const label = formatPeriod(period, locale);
  const position = yearToPosition(period.start);
  const yearStep = useTimeline((s) => s.step);
  const [hint, dismissHint] = useGaugeHint();
  const step = (direction: 1 | -1) => {
    dismissHint();
    setYear(stepPeriod(period, direction, yearStep).start);
  };

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
        {/* 다른 지도(전쟁·역병·발명 …)가 있는 시기를 띠로 쌓아 보여준다 */}
        <MapLanes period={period} />
        <Slider.Root
          min={MIN_POSITION}
          max={MAX_POSITION}
          step={1}
          value={[position]}
          onValueChange={([p]) => setYear(positionToYear(p))}
          onPointerDown={dismissHint}
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
            <span
              className={clsx(
                "block size-5 rounded-full border-[3px] border-accent bg-surface shadow-sm transition-transform group-focus-visible:ring-4 group-focus-visible:ring-accent/30 group-active:scale-110",
                hint && "motion-safe:animate-nudge",
              )}
            />
            {/* 처음 방문 때만: 기간 말풍선 위에 "← 끌어서 시대 이동 →" */}
            {hint && (
              <span
                aria-hidden
                className={clsx(
                  "pointer-events-none absolute bottom-full mb-10 rounded-md bg-accent px-3 py-1.5 text-sm leading-none font-semibold whitespace-nowrap text-white shadow-md",
                  position < 80
                    ? "start-1"
                    : position > 920
                      ? "end-1"
                      : "start-1/2 -translate-x-1/2",
                )}
              >
                ← {messages.ui.gaugeHint} →
              </span>
            )}
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
        <div className="pointer-events-none absolute inset-x-2 top-[calc(100%-0.75rem)] h-5 lg:top-full text-sm leading-none text-muted">
          {eras.map((era) => {
            const current = era.id === currentEra?.id;
            const left = (yearToPosition(era.start) / MAX_POSITION) * 100;
            // 다음 시대 눈금까지가 이름이 쓸 수 있는 폭 (넘치면 말줄임)
            const next = eras[eras.indexOf(era) + 1];
            const room =
              (next ? (yearToPosition(next.start) / MAX_POSITION) * 100 : 100) -
              left;
            return (
              <button
                key={era.id}
                type="button"
                onClick={() => setYear(Math.max(MIN_YEAR, era.start))}
                className="pointer-events-auto absolute top-0 -translate-x-px truncate ps-1.5 pe-1 whitespace-nowrap"
                style={{ left: `${left}%`, maxWidth: `${room}%` }}
              >
                <span
                  aria-hidden
                  className="absolute start-0 -top-1 h-2.5 w-px bg-line"
                />
                {/* 좁은 화면은 눈금만(현재 시대 이름은 아래 따로) */}
                <span
                  className={clsx(
                    "sr-only sm:not-sr-only sm:whitespace-nowrap",
                    current && "sm:font-semibold sm:text-foreground",
                  )}
                >
                  {messages.eras[era.id as keyof Messages["eras"]]}
                </span>
              </button>
            );
          })}
          {/* 좁은 화면: 현재 시대 이름 하나만. 다음 눈금까지로 폭을 묶으면 근세·현대처럼 짧은 시대가 잘려서
              폭 제한 없이 두고, 오른쪽 끝에서는 글자 길이만큼 안쪽으로 당겨 화면 밖으로 나가지 않게 */}
          {currentEra && (
            <span
              aria-hidden
              className="absolute top-0 ps-1.5 font-semibold whitespace-nowrap text-foreground sm:hidden"
              style={{
                left: `min(${(yearToPosition(currentEra.start) / MAX_POSITION) * 100}%, calc(100% - ${eraLabelEm(messages.eras[currentEra.id as keyof Messages["eras"]])}em))`,
              }}
            >
              {messages.eras[currentEra.id as keyof Messages["eras"]]}
            </span>
          )}
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

/** 처음 방문 때만 슬라이더 안내(손잡이 흔들기 + 말풍선). 한 번 보이면 기억하고(localStorage `gaugeHint`), 만지거나 6초 뒤 사라진다 */
const HINT_KEY = "gaugeHint";
function useGaugeHint(): [boolean, () => void] {
  const [hint, setHint] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch {
      return;
    }
    // 하이드레이션 뒤에 켜고, 실제로 보인 때 기억한다(개발 모드에서 효과가 두 번 실행돼도 첫 실행이 기억만 남기지 않게)
    const on = setTimeout(() => {
      setHint(true);
      try {
        localStorage.setItem(HINT_KEY, "1");
      } catch {}
    }, 600);
    const off = setTimeout(() => setHint(false), 6600);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, []);
  return [hint, () => setHint(false)];
}
