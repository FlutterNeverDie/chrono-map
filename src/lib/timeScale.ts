import { scaleLinear } from "d3-scale";

export const MIN_POSITION = 0;
export const MAX_POSITION = 1000;
export const MIN_YEAR = -3000;
export const MAX_YEAR = new Date().getFullYear();

/**
 * 비선형 시간 축 구간. 위치값 0~1000을 구간별로 나눠
 * 고대는 넓게(1칸 = 수십 년), 근현대는 좁게(1칸 ≈ 1년) 매핑한다.
 */
const POSITIONS = [0, 150, 350, 600, 850, 1000];
const YEARS = [MIN_YEAR, -500, 500, 1500, 1900, MAX_YEAR];

const toYear = scaleLinear().domain(POSITIONS).range(YEARS).clamp(true);
const toPosition = scaleLinear().domain(YEARS).range(POSITIONS).clamp(true);

export function positionToYear(position: number): number {
  const year = Math.round(toYear(position));
  return year === 0 ? 1 : year; // 0년은 없다
}

export function yearToPosition(year: number): number {
  return Math.round(toPosition(year));
}
