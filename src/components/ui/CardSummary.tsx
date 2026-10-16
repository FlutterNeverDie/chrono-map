"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { ChevronRightIcon } from "./icons";

/**
 * 지도 카드의 설명: 글을 몇 줄로 잘라 보여 주고, 그 아래 줄 왼쪽에 "자세히 ›"(상세 페이지로 이동), 오른쪽 끝에 trailing(위키백과 링크).
 * 그 자리에서 펼치지 않고 바로 상세 페이지로 보낸다 - 글 전체·앞뒤 사건·다스린 나라는 상세 페이지에서(본문 광고 자리).
 * 링크는 카드 자체의 클릭(선택)으로 번지지 않게 막는다. 문구는 호출하는 쪽에서 언어에 맞게 넘긴다.
 */
export function CardSummary({
  text,
  lang,
  lines = 4,
  href,
  moreLabel,
  className,
  trailing,
}: {
  text: string;
  lang?: string;
  lines?: 3 | 4;
  /** 상세 페이지 주소 */
  href: string;
  moreLabel: string;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={className}>
      {text && (
        <p
          lang={lang}
          className={clsx(
            "leading-relaxed",
            lines === 3 ? "line-clamp-3" : "line-clamp-4",
          )}
        >
          {text}
        </p>
      )}
      <div className="mt-1 flex min-h-10 items-center gap-3">
        <a
          href={href}
          onClick={(ev) => ev.stopPropagation()}
          className="inline-flex min-h-10 items-center gap-0.5 text-sm font-semibold text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground lg:text-[15px]"
        >
          {moreLabel}
          <ChevronRightIcon className="size-4 rtl:rotate-180" />
        </a>
        {trailing}
      </div>
    </div>
  );
}
