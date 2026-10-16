import type { HistoryEvent, RegionId } from "./types";
import { distanceToPeriod, periodWindow, type Period } from "./period";

/**
 * 시점별 사건 정렬.
 *
 * 1) 시점별 순서 데이터(content/rankings/<시점>.txt)에 있는 사건이 먼저, 그 순서대로.
 * 2) 나머지는 점수 순:
 *    - 지역 가까움: 시점의 regions 목록에서 앞일수록 가산 (그 나라 입장에서 가까운 역사)
 *    - importance: 세계사 기준 중요도
 *    - 시간 가까움: 선택 기간 안이면 최대, 멀수록 감산
 *    - 사는 지역(home): 선택 기간에 걸친, 사용자가 사는 지역 사건은 크게 가산 - 자기 나라 역사가 맨 앞에(앞뒤 기간 사건은 가산 없음)
 *
 * 순서 데이터가 나중에 채워지면 1)이 자동으로 우선한다. 가중치는 여기서만 조정한다.
 */
export const RANK_WEIGHTS = { region: 2, importance: 3, time: 5, home: 40 };

export type RankContext = {
  period: Period;
  /** 이 시점에서 가까운 지역 순서 (data/viewpoints.ts) */
  regionOrder: RegionId[];
  /** 이 시점의 중요 사건 id 순서 (없으면 빈 배열) */
  ranking: string[];
  /** 사용자가 사는 지역(그 지역 시점을 볼 때만 넘긴다) */
  home?: RegionId | null;
};

export function scoreEvent(e: HistoryEvent, ctx: RankContext): number {
  const regionIndex = ctx.regionOrder.indexOf(e.region);
  const regionScore =
    regionIndex < 0 ? 0 : ctx.regionOrder.length - regionIndex;
  const timeScore =
    1 - Math.min(1, distanceToPeriod(e, ctx.period) / periodWindow(ctx.period));
  return (
    regionScore * RANK_WEIGHTS.region +
    e.importance * RANK_WEIGHTS.importance +
    timeScore * RANK_WEIGHTS.time +
    (e.region === ctx.home && timeScore === 1 ? RANK_WEIGHTS.home : 0)
  );
}

export function rankEvents(
  events: HistoryEvent[],
  ctx: RankContext,
): HistoryEvent[] {
  const listed = new Map(ctx.ranking.map((id, i) => [id, i]));
  return [...events].sort((a, b) => {
    const ra = listed.get(a.id);
    const rb = listed.get(b.id);
    if (ra !== undefined || rb !== undefined) {
      return (ra ?? Infinity) - (rb ?? Infinity);
    }
    return scoreEvent(b, ctx) - scoreEvent(a, ctx) || a.start - b.start;
  });
}
