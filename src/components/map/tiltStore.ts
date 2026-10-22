import { create } from "zustand";

/**
 * 주제 지도·전쟁 지도의 기울기(0~55°) - 지도(useGlViewport)와 설정 메뉴 슬라이더(MapTiltSetting)가 같이 본다.
 * 페이지에 지도는 하나라 전역 하나로 둔다(지도가 처음 뜰 때 0으로). 본 지도는 store/ui의 tilt
 */
export const useMapTilt = create<{
  tilt: number;
  setTilt: (tilt: number) => void;
}>((set) => ({
  tilt: 0,
  setTilt: (tilt) => set({ tilt: Math.min(55, Math.max(0, tilt)) }),
}));
