import { useMemo } from "react";
import { useEvents } from "./events";
import { visibleEvents } from "@/lib/events";
import { usePeriod } from "./timeline";

/** 지금 화면에 보일 사건: 선택 기간 주변. 지도와 사건 목록이 같이 쓴다 */
export function useVisibleEvents() {
  const period = usePeriod();
  const events = useEvents();
  return useMemo(() => visibleEvents(events, period), [events, period]);
}
