"use client";

import { ChevronRightIcon } from "./icons";

/**
 * 지도 카드에서 글(상세) 페이지로 가는 작은 링크 "○○ 페이지로 ›". ExpandableText의 `expanded`에 넣어
 * 글을 펼친 뒤에만 보인다. 카드 자체의 클릭(선택)으로 번지지 않게 막는다. 문구는 호출하는 쪽에서 넘긴다.
 */
export function PageLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      onClick={(ev) => ev.stopPropagation()}
      className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-foreground hover:underline lg:text-[15px]"
    >
      {label}
      <ChevronRightIcon className="size-4 rtl:rotate-180" />
    </a>
  );
}
