import { create } from "zustand";
import type { ViewpointId } from "@/lib/types";
import { DEFAULT_VIEWPOINT, VIEWPOINTS } from "@/data/viewpoints";

export const MAX_ZOOM = 8;

type UiState = {
  /** 선택된 지도 시점. 지도를 직접 끌면 null */
  viewpoint: ViewpointId | null;
  setViewpoint: (viewpoint: ViewpointId | null) => void;
  /** 지도 가운데 경도 (끌기·회전이 끝났을 때 갱신) */
  centerLon: number;
  setCenterLon: (lon: number) => void;
  /** 지도 확대 배율 (1 = 세로 전체가 보임) */
  zoom: number;
  setZoom: (zoom: number) => void;
  /** 모바일 사건 목록 펼침 여부 */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  selectedEventId: string | null;
  selectEvent: (id: string | null) => void;
  /** 지도를 이 좌표로 옮겨 달라는 요청(사건 목록에서 고를 때). nonce로 같은 곳도 다시 이동 */
  focus: { coords: [number, number]; nonce: number } | null;
  focusOn: (coords: [number, number]) => void;
};

export const useUi = create<UiState>((set) => ({
  viewpoint: DEFAULT_VIEWPOINT,
  setViewpoint: (viewpoint) => set({ viewpoint }),
  centerLon: VIEWPOINTS.find((v) => v.id === DEFAULT_VIEWPOINT)!.lon,
  setCenterLon: (centerLon) => set({ centerLon }),
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(1, zoom)) }),
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  selectedEventId: null,
  focus: null,
  focusOn: (coords) =>
    set((s) => ({ focus: { coords, nonce: (s.focus?.nonce ?? 0) + 1 } })),
  selectEvent: (selectedEventId) =>
    set({ selectedEventId, panelOpen: selectedEventId != null }),
}));

/** 정렬 기준이 되는 시점: 선택된 시점, 없으면(끌었으면) 지도 가운데와 가장 가까운 시점 */
export function useRankingViewpoint(): ViewpointId {
  return useUi((s) => {
    if (s.viewpoint) return s.viewpoint;
    const gap = (lon: number) =>
      Math.abs(((((lon - s.centerLon + 180) % 360) + 360) % 360) - 180);
    return VIEWPOINTS.reduce((a, b) => (gap(b.lon) < gap(a.lon) ? b : a)).id;
  });
}
