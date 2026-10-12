"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HistoryEvent, Rankings } from "@/lib/types";

/**
 * 본 지도 사건 데이터. 페이지(서버)가 그 언어에 필요한 부분만 골라 넘긴다(`localizeEvent`).
 * 사건 목록 전체(content.json)를 브라우저 번들에 넣지 않기 위한 통로.
 */
const Ctx = createContext<{ events: HistoryEvent[]; rankings: Rankings }>({
  events: [],
  rankings: {},
});

export function EventsProvider({
  events,
  rankings,
  children,
}: {
  events: HistoryEvent[];
  rankings: Rankings;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ events, rankings }}>{children}</Ctx.Provider>;
}

export const useEvents = () => useContext(Ctx).events;
export const useRankings = () => useContext(Ctx).rankings;
