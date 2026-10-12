import { useMemo } from "react";
import { useEvents } from "./events";
import { filterByCategory, visibleEvents } from "@/lib/events";
import { usePeriod } from "./timeline";
import { useFilters } from "./filters";

/** 지금 화면에 보일 사건: 선택 기간 주변 + 카테고리 필터. 지도와 사건 목록이 같이 쓴다 */
export function useVisibleEvents() {
  const period = usePeriod();
  const categories = useFilters((s) => s.categories);
  const events = useEvents();
  return useMemo(
    () => filterByCategory(visibleEvents(events, period), categories),
    [events, period, categories],
  );
}
