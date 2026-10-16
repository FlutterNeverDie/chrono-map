import { useMemo } from "react";
import { create } from "zustand";
import { DEFAULT_STEP, periodOf, type Period } from "@/lib/period";
import { MAX_YEAR, MIN_YEAR } from "@/data/timeline";

type TimelineState = {
  /** 선택한 기간의 시작 연도 (기원전은 세기, 서기는 step년 단위로 맞춰 저장) */
  year: number;
  /** 아무 연도나 넣으면 그 연도가 속한 기간의 시작으로 맞춘다 */
  setYear: (year: number) => void;
  /** 서기 연도 단위(년). 설정의 YearStepSetting이 바꾸고 localStorage(`yearStep`)에 저장 */
  step: number;
  /** 단위를 바꾸면 지금 연도를 새 단위의 기간 시작으로 다시 맞춘다 */
  setStep: (step: number) => void;
};

const snap = (year: number, step: number) =>
  periodOf(Math.min(MAX_YEAR, Math.max(MIN_YEAR, year)), step).start;

export const useTimeline = create<TimelineState>((set) => ({
  // 첫 화면: 제2차 세계대전(1939~1945)이 걸치는 1940년대 - 가장 많이 알고 찾는 시기
  year: snap(1940, DEFAULT_STEP),
  setYear: (year) => set((s) => ({ year: snap(year, s.step) })),
  step: DEFAULT_STEP,
  setStep: (step) => set((s) => ({ step, year: snap(s.year, step) })),
}));

/** 현재 선택 기간 */
export function usePeriod(): Period {
  const year = useTimeline((s) => s.year);
  const step = useTimeline((s) => s.step);
  return useMemo(() => periodOf(year, step), [year, step]);
}
