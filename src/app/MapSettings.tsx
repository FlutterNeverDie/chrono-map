"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChevronDownIcon, SlidersIcon } from "@/components/ui/icons";

/**
 * 설정 메뉴의 "지도 설정" 묶음: 나라 이름 숨기기·연도 단위·기울기처럼 가끔 쓰는 것을 한 줄 아래에 접어 둔다(메뉴가 길어 읽기 어려웠다).
 * 메뉴를 열 때마다 접힌 채로 시작한다(Popover가 열 때마다 내용을 새로 만든다). 접혀 있어도 내용은 HTML에 있다
 */
export function MapSettings({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-start text-base whitespace-nowrap text-foreground hover:bg-chip"
      >
        <SlidersIcon className="size-[22px] shrink-0 text-muted" />
        {label}
        <ChevronDownIcon
          className={clsx(
            "ms-auto size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div className={clsx("mb-1 ms-6 flex flex-col", !open && "hidden")}>
        {children}
      </div>
    </div>
  );
}
