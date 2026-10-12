import { create } from "zustand";
import { FIRST_MONTH, LAST_MONTH } from "./model";

type Ww2State = {
  month: number;
  setMonth: (month: number) => void;
  selectedBattle: string | null;
  selectBattle: (id: string | null) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
};

const clamp = (m: number) =>
  Math.min(LAST_MONTH, Math.max(FIRST_MONTH, Math.round(m)));

/** 2차대전 지도 전용 상태 (본 지도 store와 별개). 처음엔 1939년 9월(폴란드 침공) */
export const useWw2 = create<Ww2State>((set) => ({
  month: clamp(1939 * 12 + 8),
  setMonth: (month) => set({ month: clamp(month) }),
  selectedBattle: null,
  selectBattle: (selectedBattle) =>
    set({ selectedBattle, panelOpen: selectedBattle != null }),
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
}));
