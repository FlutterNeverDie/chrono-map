import type { HistoryEvent } from "./types";
import { distanceToPeriod, periodWindow, type Period } from "./period";

/**
 * 선택 기간 이전에 시작해 기간 안까지 이어지는 사건 (예: 1590년대를 볼 때 1580년대에 시작한 전쟁).
 * 기간 안에서 시작한 사건은 "그 시기의 사건"이지 진행 중이 아니다.
 */
export function isOngoing(e: HistoryEvent, p: Period): boolean {
  return e.start < p.start && e.end >= p.start;
}

/** 선택 기간 ± 시대별 범위에 걸치는 사건. 정렬은 하지 않는다(ranking.ts 담당) */
export function visibleEvents(
  events: HistoryEvent[],
  p: Period,
): HistoryEvent[] {
  const range = periodWindow(p);
  return events.filter((e) => distanceToPeriod(e, p) <= range);
}
