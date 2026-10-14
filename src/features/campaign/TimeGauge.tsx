"use client";

import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useCampaign, useCampaignState } from "./store";
import { battleTitle, formatTime, tickYears, yearOf } from "./logic";

const button =
  "flex size-12 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground";

/**
 * 전쟁 지도 슬라이더. 전투가 둘 이상이면 **전투 단위**로 움직인다 — 한 칸 = 전투 하나(시작 순, 같은 간격),
 * 말풍선에는 연도 대신 전투 이름. 끌기·◀ ▶ 모두 한 칸씩, 옮기면 그 전투 시점으로 가고 지도에서 강조한다
 * (목록 패널은 열지 않는다). 전투가 하나 이하면 기간 슬라이더(TimeSlider).
 */
export function TimeGauge() {
  const c = useCampaign();
  return c.battles.length >= 2 ? <BattleGauge /> : <TimeSlider />;
}

function BattleGauge() {
  const { locale, messages } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const setT = useCampaignState((s) => s.setT);
  const selected = useCampaignState((s) => s.selectedBattle);
  const markBattle = useCampaignState((s) => s.markBattle);
  const focusOn = useCampaignState((s) => s.focusOn);

  // 한 칸 = 전투 하나. 같은 시점이면 중요한(언어판 많은) 전투 먼저
  const steps = useMemo(
    () => [...c.battles].sort((a, b) => a.start - b.start || b.links - a.links),
    [c],
  );
  const last = steps.length - 1;
  // 지금 칸: 고른 전투가 있으면 그것, 없으면 지금 시점까지 시작한 전투 중 가장 늦은 시점의 첫 전투(가장 중요한 것)
  const picked = steps.findIndex((b) => b.id === selected);
  const latest = steps.findLast((b) => b.start <= t)?.start;
  const index =
    picked >= 0
      ? picked
      : Math.max(
          0,
          steps.findIndex((b) => b.start === latest),
        );
  const battle = steps[index];

  const go = (i: number, focus: boolean) => {
    const b = steps[Math.min(last, Math.max(0, i))];
    markBattle(b.id);
    setT(b.start);
    if (focus) focusOn(b.coords);
  };

  const pct = (index / last) * 100;
  const title = battleTitle(battle, locale);
  const when = formatTime(battle.start, c.unit, locale);
  // 아래 눈금: 칸 위치에 그 전투의 연도(같은 해는 한 번, 최대 6개쯤)
  const ticks = useMemo(() => {
    const every = Math.max(1, Math.ceil(steps.length / 6));
    const out: { i: number; year: number }[] = [];
    steps.forEach((b, i) => {
      const year = yearOf(b.start, c.unit);
      if (i % every === 0 && out.at(-1)?.year !== year) out.push({ i, year });
    });
    return out;
  }, [steps, c.unit]);

  return (
    <div dir="ltr" className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={messages.ui.prevItem}
        disabled={index === 0}
        onClick={() => go(index - 1, true)}
        className={clsx(button, "disabled:opacity-30")}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
      <div className="relative min-w-0 flex-1 px-2">
        <Slider.Root
          min={0}
          max={last}
          step={1}
          value={[index]}
          onValueChange={([v]) => v !== index && go(v, false)}
          onValueCommit={([v]) => go(v, true)}
          className="relative flex h-12 w-full touch-none items-center select-none"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
            <Slider.Range className="absolute h-full rounded-full bg-[var(--side-a)]" />
            {/* 칸마다 작은 점 — 전투 하나하나가 멈추는 자리(너무 많으면 선처럼 보여 생략) */}
            {steps.length <= 60 &&
              steps.map((b, i) => (
                <span
                  key={b.id}
                  aria-hidden
                  className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/60"
                  style={{ left: `${(i / last) * 100}%` }}
                />
              ))}
          </Slider.Track>
          <Slider.Thumb
            aria-label={messages.ui.selectYear}
            aria-valuetext={`${title} (${when})`}
            className="group relative flex size-12 items-center justify-center focus:outline-none"
          >
            <span className="block size-5 rounded-full border-[3px] border-[var(--side-a)] bg-surface shadow-sm" />
            <span
              aria-hidden
              className={clsx(
                "pointer-events-none absolute bottom-full mb-0.5 max-w-[min(18rem,70vw)] truncate rounded-md bg-foreground px-3 py-1.5 text-base leading-none font-bold whitespace-nowrap text-background",
                pct < 15
                  ? "start-1"
                  : pct > 85
                    ? "end-1"
                    : "start-1/2 -translate-x-1/2",
              )}
            >
              {title}
            </span>
          </Slider.Thumb>
        </Slider.Root>
        <div className="pointer-events-none absolute inset-x-2 top-[calc(100%-0.75rem)] h-5 lg:top-full text-sm leading-none text-muted">
          {ticks.map(({ i, year }, k) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i, true)}
              className={clsx(
                "pointer-events-auto absolute top-0 -translate-x-1/2 tabular-nums whitespace-nowrap",
                k % 2 === 1 && "hidden sm:block",
              )}
              style={{ left: `${(i / last) * 100}%` }}
            >
              {year < 0 ? formatTime(year, "year", locale) : year}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label={messages.ui.nextItem}
        disabled={index === last}
        onClick={() => go(index + 1, true)}
        className={clsx(button, "disabled:opacity-30")}
      >
        <ChevronRightIcon className="size-6" />
      </button>
    </div>
  );
}

/** 전투가 하나 이하인 전쟁: 기간 슬라이더(전쟁 시작·끝·전투 시점에만 멈춤) */
function TimeSlider() {
  const { locale, messages } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const setT = useCampaignState((s) => s.setT);

  // 멈출 시점들: 전쟁 시작·끝 + 전투 시작
  const frames = useMemo(
    () =>
      [...new Set([c.start, c.end, ...c.battles.map((b) => b.start)])]
        .filter((f) => f >= c.start && f <= c.end)
        .sort((a, b) => a - b),
    [c],
  );
  const snap = (v: number) =>
    frames.reduce((best, f) =>
      Math.abs(f - v) < Math.abs(best - v) ? f : best,
    );
  const prev = frames.findLast((f) => f < t) ?? t;
  const next = frames.find((f) => f > t) ?? t;

  const span = c.end - c.start || 1;
  const pct = ((t - c.start) / span) * 100;
  const toT = (year: number) => (c.unit === "month" ? year * 12 : year);
  const ticks = tickYears(c);

  return (
    <div dir="ltr" className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={messages.ui.prevItem}
        onClick={() => setT(prev)}
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
          onValueChange={([v]) => setT(snap(v))}
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
        <div className="pointer-events-none absolute inset-x-2 top-[calc(100%-0.75rem)] h-5 lg:top-full text-sm leading-none text-muted">
          {ticks.map((y, i) => (
            <button
              key={y}
              type="button"
              onClick={() => setT(snap(toT(y)))}
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
        aria-label={messages.ui.nextItem}
        onClick={() => setT(next)}
        className={button}
      >
        <ChevronRightIcon className="size-6" />
      </button>
    </div>
  );
}
