"use client";

import { useSyncExternalStore, type ComponentType } from "react";
import clsx from "clsx";

/**
 * 지도에서 무엇을 숨기는 스위치(설정 메뉴 "지도 설정" 묶음) - 나라 이름(`names`)·사건 핀(`pins`).
 * 상태는 `<html data-<flag>="off">`(DOM이 단일 출처, ThemeToggle과 같은 방식)이고 localStorage(`<flag>`)에 저장,
 * 첫 그림 전에 RootDocument 스크립트가 되살린다. 영상 캡처(RMW)는 속성을 직접 넣어 같은 효과를 낸다.
 * 한 줄 가득 - 아이콘 + 문구 + 오른쪽 끝 스위치(켜면 숨김). 문구는 넘겨받는다(components는 i18n을 모름)
 */
export type HideFlag = "names" | "pins";

const subscribe = (flag: HideFlag) => (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [`data-${flag}`],
  });
  return () => observer.disconnect();
};
const subscribers = { names: subscribe("names"), pins: subscribe("pins") };

/** 지금 숨겼는가(서버 렌더·하이드레이션 중에는 false) */
export function useHidden(flag: HideFlag): boolean {
  return useSyncExternalStore(
    subscribers[flag],
    () => document.documentElement.dataset[flag] === "off",
    () => false,
  );
}

export function HideToggle({
  flag,
  label,
  Icon,
}: {
  flag: HideFlag;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}) {
  const hidden = useHidden(flag);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={hidden}
      onClick={() => {
        const root = document.documentElement;
        if (hidden) delete root.dataset[flag];
        else root.dataset[flag] = "off";
        try {
          if (hidden) localStorage.removeItem(flag);
          else localStorage.setItem(flag, "off");
        } catch {}
      }}
      className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-start text-base text-foreground transition-colors hover:bg-chip"
    >
      <Icon className="size-[22px] shrink-0 text-muted" />
      <span>{label}</span>
      {/* 스위치: 켜면 강조색 + 손잡이 오른쪽(아랍어는 왼쪽) */}
      <span
        aria-hidden
        className={clsx(
          "ms-auto flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
          hidden ? "bg-accent" : "bg-line",
        )}
      >
        <span
          className={clsx(
            "size-5 rounded-full bg-surface shadow-sm transition-transform",
            hidden && "translate-x-4 rtl:-translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
