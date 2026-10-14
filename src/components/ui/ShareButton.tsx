"use client";

import { useState } from "react";
import { ShareIcon } from "./icons";

/**
 * 지금 화면 주소 공유. 휴대폰은 기기 공유창(Web Share), 없으면 주소를 복사하고 잠깐 "복사됨"을 보여 준다.
 * 본 지도는 주소에 연도(?y=)가 들어 있어 지금 보는 시기 그대로 열린다. 문구는 props로.
 */
export function ShareButton({
  label,
  copiedLabel,
}: {
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
      } catch {} // 사용자가 공유창을 닫음
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-start text-base text-foreground transition-colors hover:bg-chip"
    >
      <ShareIcon className="size-[22px] shrink-0 text-muted" />
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
