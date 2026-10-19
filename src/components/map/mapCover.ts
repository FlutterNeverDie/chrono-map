"use client";

import { useEffect, useState, type RefObject } from "react";

export type MapCover = { top: number; bottom: number };

/**
 * 지도 위에 떠서 지도를 가리는 높이(px).
 * - bottom: 아래쪽 패널(`data-map-overlay`, 모바일 시트처럼 지도 폭 거의 전체). 옆 패널(데스크톱)이면 0
 * - top: 위쪽에 떠 있는 것(`data-map-top` - 지도 제목 상자, 전쟁 지도 상단 바)의 아래 끝 + 여백
 * 지도 세로 한계를 이만큼 늘려 남쪽·북쪽 끝 지점도 가리지 않은 곳으로 옮길 수 있게 하고, 고른 점을 가리지 않은 영역 가운데에 둘 때 쓴다.
 */
export function mapCover(svg: SVGSVGElement): MapCover {
  const r = svg.getBoundingClientRect();
  const panel = document
    .querySelector("[data-map-overlay]")
    ?.getBoundingClientRect();
  const bottom =
    panel && panel.height > 0 && panel.width >= r.width * 0.8
      ? Math.max(0, r.bottom - panel.top)
      : 0;
  let top = 0;
  for (const el of document.querySelectorAll("[data-map-top]")) {
    const b = el.getBoundingClientRect();
    if (b.height > 0) top = Math.max(top, b.bottom - r.top + 8);
  }
  return { top: Math.round(top), bottom: Math.round(bottom) };
}

/** mapCover를 상태로 - 시트를 열고 닫거나 제목이 바뀌어 크기가 달라지면 다시 잰다 */
export function useMapCover(svgRef: RefObject<SVGSVGElement | null>): MapCover {
  const [cover, setCover] = useState<MapCover>({ top: 0, bottom: 0 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () =>
      setCover((c) => {
        const n = mapCover(svg);
        return n.top === c.top && n.bottom === c.bottom ? c : n;
      });
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    for (const el of document.querySelectorAll(
      "[data-map-overlay], [data-map-top]",
    ))
      ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [svgRef]);
  return cover;
}
