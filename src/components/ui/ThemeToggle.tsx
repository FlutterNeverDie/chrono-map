"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

/**
 * 일반(기본) ↔ 다크. 문구는 호출하는 쪽에서 언어에 맞게 넘긴다.
 * wide: 아이콘 + 문구를 한 줄 가득(모바일 설정 메뉴 — 줄 어디를 눌러도 바뀐다)
 */
export function ThemeToggle({
  toDarkLabel,
  toLightLabel,
  wide = false,
}: {
  toDarkLabel: string;
  toLightLabel: string;
  wide?: boolean;
}) {
  const theme = useSyncExternalStore(
    subscribe,
    getTheme,
    () => "light" as const,
  );
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? toDarkLabel : toLightLabel;

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {}
      }}
      aria-label={label}
      title={label}
      className={
        wide
          ? "flex h-12 w-full items-center gap-3 rounded-md px-3 text-start text-base text-foreground transition-colors hover:bg-chip"
          : "flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground"
      }
    >
      {theme === "dark" ? (
        <SunIcon className="size-[22px]" />
      ) : (
        <MoonIcon className="size-[22px]" />
      )}
      {wide && <span>{label}</span>}
    </button>
  );
}
