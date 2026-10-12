import { scaleLinear } from "d3-scale";

export const MIN_POSITION = 0;
export const MAX_POSITION = 1000;

/**
 * 게이지 위치값(0~1000) ↔ 연도 변환을 만든다. 비선형 축:
 * 고대는 넓게(1칸 = 수십 년), 근현대는 좁게(1칸 ≈ 1년).
 * 시작·끝 연도는 데이터에 따라 정해지므로 data/timeline.ts에서 만들어 쓴다.
 */
export function createTimeScale(minYear: number, maxYear: number) {
  const positions = [0, 150, 350, 600, 850, 1000];
  const years = [minYear, -500, 500, 1500, 1900, maxYear];
  const toYear = scaleLinear().domain(positions).range(years).clamp(true);
  const toPosition = scaleLinear().domain(years).range(positions).clamp(true);
  return {
    minYear,
    maxYear,
    positionToYear(position: number): number {
      const year = Math.round(toYear(position));
      return year === 0 ? 1 : year; // 0년은 없다
    },
    yearToPosition(year: number): number {
      return Math.round(toPosition(year));
    },
  };
}
