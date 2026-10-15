"use client";

import { useEffect, useRef } from "react";
import { periodOf } from "@/lib/period";
import { useTimeline } from "@/store/timeline";

/**
 * 선택 기간을 주소의 `?y=연도`와 맞춘다 (공유 링크, F-12).
 * 처음 열 때 주소에 y가 있으면 그 연도로 시작하고, 연도가 멈추면(0.4초) 주소를 갱신한다(기록은 남기지 않음).
 */
export function useYearUrl() {
  const year = useTimeline((s) => s.year);
  const setYear = useTimeline((s) => s.setYear);
  const step = useTimeline((s) => s.step);
  // 처음 주소에서 읽은 연도. ref로 들고 있어야 개발 모드에서 효과가 두 번 실행돼도 값을 잃지 않는다
  const pending = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (pending.current === undefined) {
      const y = Number(new URLSearchParams(window.location.search).get("y"));
      pending.current = Number.isInteger(y) && y !== 0 ? y : null;
    }
    if (pending.current !== null) setYear(pending.current);
  }, [setYear]);

  useEffect(() => {
    if (pending.current === undefined) return;
    // 주소의 연도가 아직 적용되기 전이면 주소를 덮어쓰지 않는다
    if (pending.current !== null) {
      if (periodOf(pending.current, step).start !== year) return;
      pending.current = null;
    }
    // 끄는 동안 매번 주소를 바꾸면 브라우저가 History API 호출을 막는다(Safari는 30초에 100번 제한) → 멈춘 뒤 한 번만
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("y") === String(year)) return;
      url.searchParams.set("y", String(year));
      window.history.replaceState(null, "", url);
    }, 400);
    return () => clearTimeout(timer);
  }, [year, step]);
}
