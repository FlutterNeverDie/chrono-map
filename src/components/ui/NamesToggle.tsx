"use client";

import { useSyncExternalStore } from "react";
import { TagIcon } from "./icons";

/**
 * 지도 나라 이름 보이기 ↔ 숨기기. 상태는 `<html data-names="off">`(DOM이 단일 출처, ThemeToggle과 같은 방식)이고
 * localStorage(`names`)에 저장한다. 세 지도의 이름 묶음(`.map-names`)을 globals.css가 숨긴다.
 * 문구는 호출하는 쪽에서 언어에 맞게 넘긴다. 설정 메뉴용 한 줄 가득 버튼.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-names"],
  });
  return () => observer.disconnect();
}

const getHidden = () => document.documentElement.dataset.names === "off";

export function NamesToggle({
  hideLabel,
  showLabel,
}: {
  hideLabel: string;
  showLabel: string;
}) {
  const hidden = useSyncExternalStore(subscribe, getHidden, () => false);
  const label = hidden ? showLabel : hideLabel;

  return (
    <button
      type="button"
      onClick={() => {
        const root = document.documentElement;
        if (hidden) delete root.dataset.names;
        else root.dataset.names = "off";
        try {
          if (hidden) localStorage.removeItem("names");
          else localStorage.setItem("names", "off");
        } catch {}
      }}
      aria-pressed={hidden}
      className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-start text-base text-foreground transition-colors hover:bg-chip"
    >
      <TagIcon className="size-[22px] shrink-0 text-muted" />
      <span>{label}</span>
    </button>
  );
}
