"use client";

import clsx from "clsx";
import { useFilters } from "@/store/filters";
import { CATEGORIES } from "@/data/categories";
import { useI18n } from "@/i18n/I18nProvider";

const chip =
  "h-9 shrink-0 rounded-md border px-3 text-sm whitespace-nowrap transition-colors lg:h-10 lg:text-base";

/** 카테고리 필터 (F-07). 한 번에 하나만, 아무것도 고르지 않으면 전체 */
export function CategoryFilter() {
  const { messages } = useI18n();
  const selected = useFilters((s) => s.categories);
  const select = useFilters((s) => s.selectCategory);
  const clear = useFilters((s) => s.clearCategories);

  return (
    <div
      role="group"
      aria-label={messages.ui.category}
      // 가로 스크롤 끝에서는 오른쪽 패딩이 무시되는 브라우저가 있어(Safari 등), 끝에 여백 칸(after)을 둔다 - 사이 간격 1.5 + 칸 1.5 = 왼쪽 3과 같게
      className="flex gap-1.5 overflow-x-auto ps-3 pb-3 [scrollbar-width:none] after:block after:w-1.5 after:shrink-0 after:content-['']"
    >
      <button
        type="button"
        aria-pressed={selected.length === 0}
        onClick={clear}
        className={clsx(
          chip,
          selected.length === 0
            ? "border-foreground bg-foreground font-semibold text-background"
            : "border-line text-muted hover:text-foreground",
        )}
      >
        {messages.ui.allCategories}
      </button>
      {CATEGORIES.map((id) => {
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => select(id)}
            className={clsx(
              chip,
              on
                ? "border-foreground bg-foreground font-semibold text-background"
                : "border-line text-muted hover:text-foreground",
            )}
          >
            {messages.categories[id]}
          </button>
        );
      })}
    </div>
  );
}
