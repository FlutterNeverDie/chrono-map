"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * 긴 글을 몇 줄로 접어 두고 "자세히 / 접기"로 그 자리에서 펼친다.
 * 접힌 상태에서 실제로 잘리는 글일 때만 버튼을 보인다. 문구는 호출하는 쪽에서 언어에 맞게 넘긴다.
 * trailing: 같은 줄 오른쪽 끝에 둘 것(예: 위키백과 링크 WikiLink) — "자세히"와 떨어뜨려 잘못 누르지 않게.
 */
export function ExpandableText({
  text,
  lang,
  lines = 4,
  moreLabel,
  lessLabel,
  className,
  trailing,
}: {
  text: string;
  lang?: string;
  lines?: 3 | 4;
  moreLabel: string;
  lessLabel: string;
  className?: string;
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setClipped(el.scrollHeight > el.clientHeight + 1);
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
