"use client";

import { useEffect } from "react";
import { DEFAULT_STEP } from "@/lib/period";
import { useTimeline } from "@/store/timeline";
import { useI18n } from "@/i18n/I18nProvider";
import {
  YearStepSetting as StepChoice,
  loadYearStep,
} from "@/components/ui/YearStepSetting";

/**
 * 저장된 연도 단위를 불러온다(YearGauge가 주소의 연도보다 먼저 부른다).
 * 서버 HTML은 기본 단위(10년)로 그려지므로 하이드레이션 뒤에 바꾼다.
 */
export function useSavedYearStep() {
  useEffect(() => {
    const saved = loadYearStep();
    if (saved !== DEFAULT_STEP) useTimeline.getState().setStep(saved);
  }, []);
}

/** 본 지도 설정 메뉴의 "연도 단위"(공용 components/ui/YearStepSetting). 슬라이더·◀ ▶가 이 단위로 움직인다 */
export function YearStepSetting() {
  const { messages } = useI18n();
  const step = useTimeline((s) => s.step);
  const setStep = useTimeline((s) => s.setStep);
  return (
    <StepChoice label={messages.ui.yearStep} value={step} onChange={setStep} />
  );
}
