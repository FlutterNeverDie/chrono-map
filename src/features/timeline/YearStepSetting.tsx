"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { DEFAULT_STEP, YEAR_STEPS } from "@/lib/period";
import { useTimeline } from "@/store/timeline";
import { useI18n } from "@/i18n/I18nProvider";

const KEY = "yearStep";
const isStep = (n: number) => (YEAR_STEPS as readonly number[]).includes(n);

/**
 * 저장된 연도 단위를 불러온다(YearGauge가 주소의 연도보다 먼저 부른다).
 * 서버 HTML은 기본 단위(10년)로 그려지므로 하이드레이션 뒤에 바꾼다.
 */
export function useSavedYearStep() {
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (isStep(saved) && saved !== DEFAULT_STEP)
        useTimeline.getState().setStep(saved);
    } catch {}
  }, []);
}

/** 설정 메뉴의 "연도 단위": 5·10·30·50·100년 중 하나(기본 10). 슬라이더·◀ ▶가 이 단위로 움직인다 */
export function YearStepSetting() {
  const { messages } = useI18n();
  const step = useTimeline((s) => s.step);
  const setStep = useTimeline((s) => s.setStep);
  return (
    <div className="px-3 py-2">
      <p className="text-sm text-muted">{messages.ui.yearStep}</p>
      <div
        role="radiogroup"
        aria-label={messages.ui.yearStep}
        className="mt-1.5 flex gap-1"
      >
        {YEAR_STEPS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={step === n}
            onClick={() => {
              setStep(n);
              try {
                if (n === DEFAULT_STEP) localStorage.removeItem(KEY);
                else localStorage.setItem(KEY, String(n));
              } catch {}
            }}
            className={clsx(
              "flex h-11 min-w-11 flex-1 items-center justify-center rounded-md text-base tabular-nums transition-colors",
              step === n
                ? "bg-foreground font-bold text-background"
                : "bg-chip hover:bg-line",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
