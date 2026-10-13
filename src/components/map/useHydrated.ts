"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * 브라우저에서 하이드레이션이 끝났는가(서버 렌더·하이드레이션 중에는 false).
 * 해안선처럼 큰 지도 경로를 서버 HTML에 넣지 않을 때 쓴다 — 같은 데이터가 JS 번들에 이미 있어
 * HTML에 또 넣으면 페이지가 수백 KB 커진다(복사본·clip·외곽선마다 반복).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
