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

/**
 * 가까운 핀 묶기(+N): 고른 사건 → 중요한 순으로 놓으면서, 이미 놓인 대표 핀과 reach 안이면 그 묶음에 넣는다.
 * x·y·reach는 같은 단위(지도 좌표), x는 width마다 이어진다(날짜 변경선 양쪽도 묶임). 반환 순서 = 대표 핀을 놓은 순서.
 * members: 그 묶음의 핀 전부(대표 포함, 놓은 순서).
 */
export function clusterPins<
  T extends { id: string; importance: number; x: number; y: number },
>(
  pins: T[],
  reach: number,
  width: number,
  selectedId: string | null,
): { pin: T; more: number; members: T[] }[] {
  const order = [...pins].sort(
    (a, b) =>
      Number(b.id === selectedId) - Number(a.id === selectedId) ||
      b.importance - a.importance ||
      (a.id < b.id ? -1 : 1),
  );
  // 한 칸 = reach인 격자에 대표 핀을 넣어 둘레 3×3칸만 본다
  const cols = Math.max(1, Math.floor(width / reach));
  const grid = new Map<number, number[]>();
  const out: { pin: T; more: number; members: T[] }[] = [];
  for (const p of order) {
    const cx = Math.floor((((p.x % width) + width) % width) / reach) % cols;
    const cy = Math.floor(p.y / reach);
    let hit = -1;
    let best = reach * reach;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const k of grid.get(((cx + dx + cols) % cols) * 1e5 + cy + dy) ??
          []) {
          const q = out[k].pin;
          let ddx = Math.abs(p.x - q.x) % width;
          ddx = Math.min(ddx, width - ddx);
          const d = ddx * ddx + (p.y - q.y) ** 2;
          if (d <= best) {
            best = d;
            hit = k;
          }
        }
    if (hit >= 0) {
      out[hit].more++;
      out[hit].members.push(p);
      continue;
    }
    const key = cx * 1e5 + cy;
    grid.set(key, [...(grid.get(key) ?? []), out.length]);
    out.push({ pin: p, more: 0, members: [p] });
  }
  return out;
}

/**
 * 묶음 핀(+N)으로 고른 사건들을 목록에서 한 덩어리로: 그중 목록에서 가장 앞선 자리에 ids 순서대로 붙인다.
 * 지도를 움직여 정렬이 바뀌어도 덩어리 안 순서는 그대로(고른 카드 밑 사건이 계속 바뀌지 않게)
 */
export function groupTogether<T extends { id: string }>(
  list: T[],
  ids: string[] | null,
): T[] {
  if (!ids || ids.length < 2) return list;
  const set = new Set(ids);
  const at = list.findIndex((e) => set.has(e.id));
  if (at < 0) return list;
  const byId = new Map(list.map((e) => [e.id, e]));
  const block = ids.flatMap((id) => byId.get(id) ?? []);
  const rest = list.filter((e) => !set.has(e.id));
  return [...rest.slice(0, at), ...block, ...rest.slice(at)];
}
