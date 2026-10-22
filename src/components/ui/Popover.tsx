"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * 누르면 펼쳐지는 작은 메뉴(모바일 상단 바의 지도 고르기·시점·설정).
 * 바깥을 누르거나 Esc를 누르면 닫힌다. 내용은 닫혀 있어도 HTML에 있다(링크를 검색 로봇이 따라가게).
 */
export function Popover({
  label,
  button,
  align = "start",
  side = "bottom",
  children,
}: {
  /** 버튼의 접근성 이름(아이콘만 있을 때) */
  label?: string;
  /** 버튼 안 내용 */
  button: ReactNode;
  align?: "start" | "end";
  /** 펼치는 방향: 버튼 아래(기본) 또는 위(하단 바) */
  side?: "bottom" | "top";
  /** close를 받아 항목을 고른 뒤 닫을 수 있다 */
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  /** 연 횟수 - 열 때마다 내용을 새로 만들어 접었다 펴는 칸(지도 설정·문의)이 늘 접힌 채로 시작하게 */
  const [opens, setOpens] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          if (!open) setOpens((n) => n + 1);
          setOpen(!open);
        }}
        className={clsx(
          "flex h-10 max-w-full items-center gap-1.5 rounded-md px-2.5 text-base whitespace-nowrap hover:bg-chip",
          open && "bg-chip",
        )}
      >
        {button}
      </button>
      <div
        className={clsx(
          "absolute z-40 min-w-48 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface p-1 shadow-lg",
          // 키 작은 휴대폰에서 메뉴가 화면 밖으로 잘리지 않게 높이를 화면 안으로(넘치면 메뉴 안에서 스크롤)
          side === "bottom"
            ? "top-12 max-h-[calc(100dvh-4rem)]"
            : "bottom-12 max-h-[calc(100dvh-var(--bar-h,4rem)-max(0.5rem,env(safe-area-inset-top)))]",
          align === "start" ? "start-0" : "end-0",
          !open && "hidden",
        )}
      >
        <Fragment key={opens}>{children(() => setOpen(false))}</Fragment>
      </div>
    </div>
  );
}
