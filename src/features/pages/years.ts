import type { HistoryEvent } from "@/lib/types";
import { isOngoing, visibleEvents } from "@/lib/events";
import { periodOf, type Period } from "@/lib/period";
import { EVENTS } from "@/data/content";
import { markersIn } from "@/data/mapMarkers";

/**
 * 연도 페이지(/year/[slug])의 기간 목록과 내용. 서버(빌드)에서만 쓴다.
 * 주소: 서기 10년 단위는 시작 연도("1490"), 기원전 세기는 "300bc"(기원전 300–201년).
 */
export function periodSlug(p: Period): string {
  return p.start < 0 ? `${-p.start}bc` : String(p.start);
}

/** 중요한 순, 같으면 이른 순 */
const byImportance = (a: HistoryEvent, b: HistoryEvent) =>
  b.importance - a.importance || a.start - b.start;

/** 그 기간 안에서 시작한 사건 */
function startedIn(p: Period): HistoryEvent[] {
  return EVENTS.filter((e) => e.start >= p.start && e.start <= p.end).sort(
    byImportance,
  );
}

/**
 * 페이지를 만드는 기간: 그 기간에 시작한 사건이 하나 이상 있는 곳만.
 * 빈 기간까지 만들면 내용 없는 페이지가 수백 개 생긴다(검색·애드센스 심사에 불리).
 */
export const YEAR_PERIODS: Period[] = (() => {
  const seen = new Map<number, Period>();
  for (const e of EVENTS) {
    const p = periodOf(e.start);
    seen.set(p.start, p);
  }
  return [...seen.values()].sort((a, b) => a.start - b.start);
})();

export type YearPageData = {
  period: Period;
  events: HistoryEvent[];
  /** 이전 기간에 시작해 이 기간까지 이어지는 일(중요한 순, 최대 12개) */
  ongoing: HistoryEvent[];
  /** 지도가 이 기간에 함께 보여주는 앞뒤 시기의 사건(중요한 순, 최대 12개) */
  nearby: HistoryEvent[];
  /** 이 기간과 겹치는 전쟁 지도·주제 지도 */
  maps: ReturnType<typeof markersIn>;
  prev: Period | null;
  next: Period | null;
};

export function yearPage(slug: string): YearPageData | null {
  const i = YEAR_PERIODS.findIndex((p) => periodSlug(p) === slug);
  if (i < 0) return null;
  const period = YEAR_PERIODS[i];
  const events = startedIn(period);
  const ongoing = EVENTS.filter((e) => isOngoing(e, period))
    .sort(byImportance)
    .slice(0, 12);
  const shown = new Set([...events, ...ongoing]);
  return {
    period,
    events,
    ongoing,
    nearby: visibleEvents(EVENTS, period)
      .filter((e) => !shown.has(e))
      .sort(byImportance)
      .slice(0, 12),
    maps: markersIn(period.start, period.end).slice(0, 8),
    prev: YEAR_PERIODS[i - 1] ?? null,
    next: YEAR_PERIODS[i + 1] ?? null,
  };
}

/** 기간별 사건 수 (목록 페이지) */
export function eventCount(p: Period): number {
  return startedIn(p).length;
}
