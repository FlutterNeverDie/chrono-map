import type { HistoryEvent } from "./types";
import { yearWindow } from "./timeScale";

/** 선택 연도와 사건 기간 사이 거리(년). 기간 안이면 0 */
export function yearDistance(e: HistoryEvent, year: number): number {
  if (year < e.start) return e.start - year;
  if (year > e.end) return year - e.end;
  return 0;
}

/** 선택 연도에 진행 중인 사건인가 (기간 사건 표시용) */
export function isOngoing(e: HistoryEvent, year: number): boolean {
  return e.start < e.end && year >= e.start && year <= e.end;
}

/** 선택 연도 주변(±시대별 범위)에 걸치는 사건. 정렬은 하지 않는다(ranking.ts 담당) */
export function visibleEvents(
  events: HistoryEvent[],
  year: number,
): HistoryEvent[] {
  const range = yearWindow(year);
  return events.filter((e) => yearDistance(e, year) <= range);
}
