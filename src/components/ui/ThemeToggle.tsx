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

/** 일반(기본) ↔ 다크. 문구는 호출하는 쪽에서 언어에 맞게 넘긴다 */
export function ThemeToggle({
  toDarkLabel,
  toLightLabel,
}: {
  toDarkLabel: string;
  toLightLabel: string;
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
      className="flex size-12 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground"
    >
      {theme === "dark" ? (
        <SunIcon className="size-[22px]" />
      ) : (
        <MoonIcon className="size-[22px]" />
      )}
    </button>
  );
}
