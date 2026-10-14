"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * 긴 글을 몇 줄로 접어 두고 "자세히 / 접기"로 그 자리에서 펼친다.
 * 접힌 상태에서 실제로 잘리는 글일 때만 버튼을 보인다. 문구는 호출하는 쪽에서 언어에 맞게 넘긴다.
 * trailing: 같은 줄 오른쪽 끝에 둘 것(예: 위키백과 링크 WikiLink) — "펼치기"와 떨어뜨려 잘못 누르지 않게.
 * expanded: 글을 끝까지 본 뒤에만 보여 줄 것(예: 사건 상세 페이지 링크). 펼쳤을 때, 또는 글이 짧아 다 보일 때
 * 본문 바로 아래에 나온다 — 처음 화면에는 버튼을 늘리지 않는다.
 */
export function ExpandableText({
  text,
  lang,
  lines = 4,
  moreLabel,
  lessLabel,
  className,
  trailing,
  expanded,
}: {
  text: string;
  lang?: string;
  lines?: 3 | 4;
  moreLabel: string;
  lessLabel: string;
  className?: string;
  trailing?: ReactNode;
  expanded?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  // 잘림 여부를 재 본 뒤에만 "짧은 글" 판정(처음 그릴 때 잠깐 보였다 사라지지 않게)
  const [measured, setMeasured] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => {
      setClipped(el.scrollHeight > el.clientHeight + 1);
      setMeasured(true);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);

  return (
    <div className={className}>
      <p
        ref={ref}
        lang={lang}
        className={clsx(
          "leading-relaxed",
          !open && (lines === 3 ? "line-clamp-3" : "line-clamp-4"),
        )}
      >
        {text}
      </p>
      {expanded && (open || (measured && !clipped)) && (
        <div className="mt-2">{expanded}</div>
      )}
      {(clipped || open || trailing) && (
        <div className="mt-1 flex min-h-10 items-center gap-3">
          {(clipped || open) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
              aria-expanded={open}
              className="min-h-10 text-sm font-semibold text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground"
            >
              {open ? lessLabel : moreLabel}
            </button>
          )}
          {trailing}
        </div>
      )}
    </div>
  );
}
