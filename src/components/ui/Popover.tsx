"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * 누르면 펼쳐지는 작은 메뉴(모바일 상단 바의 지도 고르기·시점·설정).
 * 바깥을 누르거나 Esc를 누르면 닫힌다. 내용은 닫혀 있어도 HTML에 있다(링크를 검색 로봇이 따라가게).
 */
export function Popover({
  label,
  button,
  align = "start",
  children,
}: {
  /** 버튼의 접근성 이름(아이콘만 있을 때) */
  label?: string;
  /** 버튼 안 내용 */
  button: ReactNode;
  align?: "start" | "end";
  /** close를 받아 항목을 고른 뒤 닫을 수 있다 */
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
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
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex h-10 max-w-full items-center gap-1.5 rounded-md px-2.5 text-base whitespace-nowrap hover:bg-chip",
          open && "bg-chip",
        )}
      >
        {button}
      </button>
      <div
        className={clsx(
          "absolute top-12 z-40 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-lg",
          align === "start" ? "start-0" : "end-0",
          !open && "hidden",
        )}
      >
        {children(() => setOpen(false))}
      </div>
    </div>
  );
}
