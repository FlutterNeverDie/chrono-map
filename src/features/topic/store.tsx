"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { DEFAULT_STEP } from "@/lib/period";
import { loadYearStep } from "@/components/ui/YearStepSetting";
import { startT } from "./logic";
import type { Topic, TopicPoint } from "./types";

type State = {
  t: number;
  setT: (t: number) => void;
  /** ◀ ▶가 움직이는 연도 단위(설정 메뉴 - 본 지도와 같은 저장값) */
  step: number;
  setStep: (step: number) => void;
  selected: string | null;
  select: (id: string | null) => void;
  /** 고른 작은 점(전투) - 고르면 그 항목도 고른다 */
  selectedPoint: TopicPoint | null;
  selectPoint: (p: TopicPoint) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  focus: { coords: [number, number]; nonce: number } | null;
  focusOn: (coords: [number, number]) => void;
};

const Ctx = createContext<{ topic: Topic; store: StoreApi<State> } | null>(
  null,
);

/** 주제 지도 하나의 데이터 + 화면 상태(페이지마다 새로 만든다). 처음 시점은 지도에 가장 많이 보이는 때(startT) */
export function TopicProvider({
  topic,
  children,
}: {
  topic: Topic;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createStore<State>((set) => ({
      t: startT(topic),
      setT: (t) => set({ t: Math.round(t) }),
      step: DEFAULT_STEP,
      setStep: (step) => set({ step }),
      selected: null,
      select: (selected) =>
        set({ selected, selectedPoint: null, panelOpen: selected != null }),
      selectedPoint: null,
      selectPoint: (p) =>
        set({ selected: p.item, selectedPoint: p, panelOpen: true }),
      panelOpen: false,
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      focus: null,
      focusOn: (coords) =>
        set((s) => ({ focus: { coords, nonce: (s.focus?.nonce ?? 0) + 1 } })),
    })),
  );
  // 저장된 연도 단위(서버 HTML은 기본 10년이라 하이드레이션 뒤에)
  useEffect(() => store.getState().setStep(loadYearStep()), [store]);
  // 주소에 ?item=<id>가 있으면 그 항목을 고른 상태로 시작 (본 지도의 "이 시기의 다른 지도" 바로가기)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("item");
    const item = id && topic.items.find((i) => i.id === id);
    if (!item) return;
    const s = store.getState();
    s.setT(item.start);
    s.select(item.id);
    s.focusOn(item.coords);
  }, [topic, store]);

  return <Ctx.Provider value={{ topic, store }}>{children}</Ctx.Provider>;
}

function useCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error("TopicProvider 안에서만 쓸 수 있어요");
  return v;
}
export const useTopic = () => useCtx().topic;
export const useTopicStore = () => useCtx().store;
export function useTopicState<T>(selector: (s: State) => T): T {
  return useStore(useCtx().store, selector);
}
