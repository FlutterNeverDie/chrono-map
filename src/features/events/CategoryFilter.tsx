"use client";

import clsx from "clsx";
import { useFilters } from "@/store/filters";
import { CATEGORIES } from "@/data/categories";
import { useI18n } from "@/i18n/I18nProvider";

const chip =
  "h-9 shrink-0 rounded-md border px-3 text-sm whitespace-nowrap transition-colors";

/** 카테고리 필터 (F-07). 아무것도 고르지 않으면 전체 */
export function CategoryFilter() {
  const { messages } = useI18n();
  const selected = useFilters((s) => s.categories);
  const toggle = useFilters((s) => s.toggleCategory);
  const clear = useFilters((s) => s.clearCategories);

  return (
    <div
      role="group"
      aria-label={messages.ui.category}
      className="flex gap-1.5 overflow-x-auto px-3 pb-3 [scrollbar-width:none]"
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
            onClick={() => toggle(id)}
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
