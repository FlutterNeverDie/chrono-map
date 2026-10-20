import { create } from "zustand";
import type { RegionId, ViewpointId } from "@/lib/types";
import { DEFAULT_VIEWPOINT, VIEWPOINTS } from "@/data/viewpoints";

export const MAX_ZOOM = 16;
/** 지도 기울기 최대(도) - 더 기울이면 먼 쪽이 너무 작아 읽을 수 없다 */
export const MAX_TILT = 55;

type UiState = {
  /** 첫 화면 시점을 언어에 맞춘다(WorldMap이 처음 그릴 때 한 번) */
  initViewpoint: (viewpoint: ViewpointId) => void;
  /** 선택된 지도 시점. 지도를 직접 끌면 null */
  viewpoint: ViewpointId | null;
  setViewpoint: (viewpoint: ViewpointId | null) => void;
  /** 지도 가운데 경도 (끌기·회전이 끝났을 때 갱신) */
  centerLon: number;
  setCenterLon: (lon: number) => void;
  /** 지도 확대 배율 (1 = 세로 전체가 보임) */
  zoom: number;
  setZoom: (zoom: number) => void;
  /** 지도 기울기(도, 0 = 위에서 내려다봄). 책상 위 지도를 눈높이에서 보듯 아래는 크게, 위는 작게 */
  tilt: number;
  setTilt: (tilt: number) => void;
  /** 모바일 사건 목록 펼침 여부 */
  panelOpen: boolean;
  /** 모바일 시트를 절반만 연 상태(지도의 점을 탭해 열었을 때 - 고른 점과 카드가 한 화면에 보이게) */
  panelHalf: boolean;
  /** 열고 닫기(머리줄·접기 버튼). 열면 항상 크게 */
  setPanelOpen: (open: boolean) => void;
  /** 크게 연 시트를 절반으로(머리줄 탭·아래로 쓸기) */
  shrinkPanel: () => void;
  selectedEventId: string | null;
  selectEvent: (id: string | null) => void;
  /** 지도의 점을 탭해 고르기: 닫혀 있었으면 시트를 절반만 연다(이미 크게 열려 있으면 그대로) */
  selectFromMap: (id: string) => void;
  /** 지도를 이 좌표로 옮겨 달라는 요청(사건 목록에서 고를 때). nonce로 같은 곳도 다시 이동 */
  focus: { coords: [number, number]; nonce: number } | null;
  focusOn: (coords: [number, number]) => void;
  /** 사용자가 사는 지역과 그 첫 화면 시점(기기 시간대, WorldMap이 처음에 한 번). 그 시점을 보는 동안 이 지역 사건을 먼저 */
  home: { region: RegionId; viewpoint: ViewpointId } | null;
  setHome: (home: UiState["home"]) => void;
};

export const useUi = create<UiState>((set) => ({
  initViewpoint: (viewpoint) =>
    set({
      viewpoint,
      centerLon: VIEWPOINTS.find((v) => v.id === viewpoint)!.lon,
    }),
  viewpoint: DEFAULT_VIEWPOINT,
  setViewpoint: (viewpoint) => set({ viewpoint }),
  centerLon: VIEWPOINTS.find((v) => v.id === DEFAULT_VIEWPOINT)!.lon,
  setCenterLon: (centerLon) => set({ centerLon }),
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(1, zoom)) }),
  tilt: 0,
  setTilt: (tilt) => set({ tilt: Math.min(MAX_TILT, Math.max(0, tilt)) }),
  panelOpen: false,
  panelHalf: false,
  setPanelOpen: (panelOpen) => set({ panelOpen, panelHalf: false }),
  shrinkPanel: () => set({ panelOpen: true, panelHalf: true }),
  selectedEventId: null,
  focus: null,
  focusOn: (coords) =>
    set((s) => ({ focus: { coords, nonce: (s.focus?.nonce ?? 0) + 1 } })),
  home: null,
  setHome: (home) => set({ home }),
  selectEvent: (selectedEventId) =>
    set({ selectedEventId, panelOpen: selectedEventId != null }),
  selectFromMap: (selectedEventId) =>
    set((s) => ({
      selectedEventId,
      panelOpen: true,
      panelHalf: !s.panelOpen || s.panelHalf,
    })),
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
