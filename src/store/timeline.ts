import { useMemo } from "react";
import { create } from "zustand";
import { periodOf, type Period } from "@/lib/period";
import { MAX_YEAR, MIN_YEAR } from "@/lib/timeScale";

type TimelineState = {
  /** 선택한 기간의 시작 연도 (기원전은 세기, 서기는 10년 단위로 맞춰 저장) */
  year: number;
  /** 아무 연도나 넣으면 그 연도가 속한 기간의 시작으로 맞춘다 */
  setYear: (year: number) => void;
};

const snap = (year: number) =>
  periodOf(Math.min(MAX_YEAR, Math.max(MIN_YEAR, year))).start;

export const useTimeline = create<TimelineState>((set) => ({
  year: snap(1492),
  setYear: (year) => set({ year: snap(year) }),
}));

/** 현재 선택 기간 */
export function usePeriod(): Period {
  const year = useTimeline((s) => s.year);
  return useMemo(() => periodOf(year), [year]);
}
