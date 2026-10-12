"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { keyframes } from "./logic";
import type { Topic } from "./types";

type State = {
  t: number;
  setT: (t: number) => void;
  selected: string | null;
  select: (id: string | null) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  focus: { coords: [number, number]; nonce: number } | null;
  focusOn: (coords: [number, number]) => void;
};

const Ctx = createContext<{ topic: Topic; store: StoreApi<State> } | null>(
  null,
);

/** 주제 지도 하나의 데이터 + 화면 상태(페이지마다 새로 만든다). 처음 시점은 첫 항목 */
export function TopicProvider({
  topic,
  children,
}: {
  topic: Topic;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createStore<State>((set) => ({
      t: keyframes(topic)[0] ?? topic.scale[0] * 12,
      setT: (t) => set({ t: Math.round(t) }),
      selected: null,
      select: (selected) => set({ selected, panelOpen: selected != null }),
      panelOpen: false,
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      focus: null,
      focusOn: (coords) =>
        set((s) => ({ focus: { coords, nonce: (s.focus?.nonce ?? 0) + 1 } })),
    })),
  );
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
