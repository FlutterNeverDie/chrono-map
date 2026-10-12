import type { ContinentId, HistoryEvent } from "./types";
import { yearWindow } from "./timeScale";

/** 선택 연도 주변 사건을 대륙별로 묶는다. 가까운 연도 → importance 높은 순. */
export function eventsByContinent(
  events: HistoryEvent[],
  year: number,
): Map<ContinentId, HistoryEvent[]> {
  const range = yearWindow(year);
  const distance = (e: HistoryEvent) => {
    const end = e.endYear ?? e.year;
    if (year >= e.year && year <= end) return 0;
    return Math.min(Math.abs(e.year - year), Math.abs(end - year));
  };

  const result = new Map<ContinentId, HistoryEvent[]>();
  for (const e of events) {
    if (distance(e) > range) continue;
    const list = result.get(e.continent) ?? [];
    list.push(e);
    result.set(e.continent, list);
  }
  for (const list of result.values()) {
    list.sort((a, b) => distance(a) - distance(b) || b.importance - a.importance);
  }
  return result;
}
