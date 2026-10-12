"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useUi } from "@/store/ui";
import { VIEWPOINTS } from "@/data/viewpoints";
import { useI18n } from "@/i18n/I18nProvider";

/** 지도 시점 선택(7개). 모바일은 가로 스크롤 */
export function ViewpointBar() {
  const { messages } = useI18n();
  const viewpoint = useUi((s) => s.viewpoint);
  const setViewpoint = useUi((s) => s.setViewpoint);
  const barRef = useRef<HTMLDivElement>(null);

  // 좁은 화면에서 선택된 시점 버튼이 가려지지 않도록 가로 스크롤을 맞춘다
  useEffect(() => {
    const bar = barRef.current;
    const button = bar?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!bar || !button) return;
    bar.scrollTo({
      left: button.offsetLeft - (bar.clientWidth - button.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [viewpoint]);

  return (
    <div
      ref={barRef}
      role="group"
      aria-label={messages.ui.viewpoint}
      className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface/95 p-1 backdrop-blur [scrollbar-width:none]"
    >
      {VIEWPOINTS.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={viewpoint === v.id}
          onClick={() => setViewpoint(v.id)}
          className={clsx(
            "h-10 shrink-0 rounded-md px-3.5 text-[15px] whitespace-nowrap transition-colors lg:h-11 lg:px-4 lg:text-base",
            viewpoint === v.id
              ? "bg-foreground font-semibold text-background"
              : "text-muted hover:bg-chip hover:text-foreground",
          )}
        >
          {messages.viewpoints[v.id]}
        </button>
      ))}
    </div>
  );
}
