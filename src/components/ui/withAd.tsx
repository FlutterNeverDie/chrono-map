import type { ReactNode } from "react";

/**
 * 그려 둔 목록 항목(<li>들) 사이에 광고 한 칸을 끼워 넣는다(기본: 3번째 뒤, 항목이 적으면 맨 끝).
 * 광고 자체는 features/ads의 AdSlot을 화면 조립(app)이 넘긴다 — 목록 기능은 광고를 모른다.
 */
export function withAd(items: ReactNode[], ad: ReactNode, after = 3) {
  if (!ad) return items;
  const out = [...items];
  out.splice(Math.min(after, out.length), 0, <li key="__ad">{ad}</li>);
  return out;
}
