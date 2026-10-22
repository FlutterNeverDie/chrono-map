"use client";

import { useState } from "react";
import { CheckIcon, ShareIcon } from "./icons";

/**
 * 지금 화면 주소 공유. 휴대폰은 기기 공유창(Web Share), 없으면 주소를 복사하고 잠깐 "복사됨"을 보여 준다.
 * 본 지도는 주소에 연도(?y=)가 들어 있어 지금 보는 시기 그대로 열린다. 문구는 props로.
 * 설정 메뉴 맨 아래 줄(소개·개인정보처리방침) 오른쪽 끝의 아이콘 버튼 - 한 줄을 따로 쓰면 메뉴가 길었다
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
      aria-label={label}
      title={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground"
    >
      {copied ? (
        <CheckIcon className="size-5 text-accent" />
      ) : (
        <ShareIcon className="size-5" />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
