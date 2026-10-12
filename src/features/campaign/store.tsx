"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { Campaign } from "./types";

type State = {
  t: number;
  setT: (t: number) => void;
  selectedBattle: string | null;
  selectBattle: (id: string | null) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /** 전투 목록에서 고르면 지도를 그 좌표로 */
  focus: { coords: [number, number]; nonce: number } | null;
  focusOn: (coords: [number, number]) => void;
};

const Ctx = createContext<{
  campaign: Campaign;
  store: StoreApi<State>;
} | null>(null);

/** 전쟁 지도 하나의 데이터 + 화면 상태(페이지마다 새로 만든다) */
export function CampaignProvider({
  campaign,
  children,
}: {
  campaign: Campaign;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createStore<State>((set) => ({
      t: campaign.start,
      setT: (t) =>
        set({
          t: Math.min(campaign.end, Math.max(campaign.start, Math.round(t))),
        }),
      selectedBattle: null,
      selectBattle: (selectedBattle) =>
        set({ selectedBattle, panelOpen: selectedBattle != null }),
      panelOpen: false,
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      focus: null,
      focusOn: (coords) =>
        set((s) => ({ focus: { coords, nonce: (s.focus?.nonce ?? 0) + 1 } })),
    })),
  );
  return <Ctx.Provider value={{ campaign, store }}>{children}</Ctx.Provider>;
}

function useCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error("CampaignProvider 안에서만 쓸 수 있어요");
  return v;
}
export const useCampaign = () => useCtx().campaign;
export function useCampaignState<T>(selector: (s: State) => T): T {
  return useStore(useCtx().store, selector);
}
export const useCampaignStore = () => useCtx().store;
