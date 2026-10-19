"use client";

import { useEffect } from "react";
import { useEvents } from "@/store/events";
import { useTimeline } from "@/store/timeline";
import { useUi } from "@/store/ui";

/**
 * 주소에 `?event=<사건id>`가 있으면 그 사건의 연도로 가서 고르고(목록이 열리고 카드 강조), 지도를 그 자리로 옮긴다.
 * 스레드 "오늘의 세계사"처럼 밖에서 사건 하나를 지도로 보여 줄 때 쓴다(주제 지도 ?item=, 전쟁 지도 ?battle=와 같은 방식).
 * 연도는 ?y보다 이 값이 우선이다(useYearUrl이 나중에 주소의 y를 이 연도로 맞춘다).
 */
export function useEventUrl() {
  const events = useEvents();
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("event");
    const event = id && events.find((e) => e.id === id);
    if (!event) return;
    useTimeline.getState().setYear(event.start);
    const ui = useUi.getState();
    ui.selectEvent(event.id);
    ui.focusOn(event.coords);
  }, [events]);
}
