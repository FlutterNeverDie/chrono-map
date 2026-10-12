"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * 긴 글을 몇 줄로 접어 두고 "자세히 / 접기"로 그 자리에서 펼친다.
 * 접힌 상태에서 실제로 잘리는 글일 때만 버튼을 보인다. 문구는 호출하는 쪽에서 언어에 맞게 넘긴다.
 */
export function ExpandableText({
  text,
  lang,
  lines = 4,
  moreLabel,
  lessLabel,
  className,
}: {
  text: string;
  lang?: string;
  lines?: 3 | 4;
  moreLabel: string;
  lessLabel: string;
  className?: string;
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
      {(clipped || open) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          aria-expanded={open}
          className="mt-1 text-sm font-semibold text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground"
        >
          {open ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
