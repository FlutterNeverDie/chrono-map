"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * 지도 화면 위쪽에 떠 있는 화면별 도구(본 지도의 시점, 전쟁 지도의 범례).
 * 지도 고르기·언어·테마는 하단 바(BottomBar)에 있다 — 위쪽은 지도를 가리지 않게 도구만 둔다.
 * 모바일은 mobileTool(예: 시점 ▾ 펼침 메뉴)을, 없으면 children을 보여준다.
 * 높이는 화면 루트의 --top-h와 맞춘다(목록 패널을 펼칠 때 이 아래로만 올라온다).
 */
export function SiteHeader({
  mobileTool,
  children,
}: {
  mobileTool?: ReactNode;
  children?: ReactNode;
}) {
  if (!mobileTool && !children) return null;
  return (
    <div
      data-map-top
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex p-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:p-3"
    >
      {mobileTool && (
        <div className="pointer-events-auto flex h-12 items-center rounded-lg border border-line bg-surface/95 px-1 lg:hidden">
          {mobileTool}
        </div>
      )}
      {children && (
        <div
          className={clsx(
            // 데스크톱: 오른쪽 목록 패널(lg 34rem, xl 40rem, 2xl 46rem)과 겹치지 않게
            "pointer-events-auto max-w-full min-w-0 lg:max-w-[calc(100%-36rem)] xl:max-w-[calc(100%-42rem)] 2xl:max-w-[calc(100%-48rem)]",
            mobileTool && "max-lg:hidden",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
