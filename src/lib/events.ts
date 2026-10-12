import type { CategoryId, HistoryEvent } from "./types";
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

/** 카테고리 필터. 고른 게 없으면 전부 통과 */
export function filterByCategory(
  events: HistoryEvent[],
  categories: CategoryId[],
): HistoryEvent[] {
  return categories.length
    ? events.filter((e) => categories.includes(e.category))
    : events;
}

/** 지도에 한 번에 찍는 핀 상한 — 사건이 몰린 시기에도 화면이 버벅이지 않게 */
export const MAX_PINS = 60;

/** 중요한 사건부터 최대 limit개(고른 사건은 항상 포함) */
export function limitPins(
  events: HistoryEvent[],
  selectedId: string | null,
  limit = MAX_PINS,
): HistoryEvent[] {
  if (events.length <= limit) return events;
  const top = [...events]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit);
  const selected = events.find((e) => e.id === selectedId);
  return selected && !top.includes(selected) ? [...top, selected] : top;
}
