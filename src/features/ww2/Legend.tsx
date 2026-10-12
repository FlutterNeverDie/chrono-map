"use client";

import { useI18n } from "@/i18n/I18nProvider";

/** 진영 색 범례 */
export function Legend() {
  const { messages } = useI18n();
  const items = [
    { color: "var(--ww2-axis)", label: messages.ww2.axis },
    { color: "var(--ww2-allies)", label: messages.ww2.allies },
    { color: "var(--ww2-neutral)", label: messages.ww2.neutral },
  ];
  return (
    <div className="flex h-12 w-fit items-center gap-4 rounded-lg border border-line bg-surface/95 px-4 text-[15px] backdrop-blur">
      {items.map((i) => (
        <span
          key={i.label}
          className="inline-flex items-center gap-2 whitespace-nowrap"
        >
          <span
            aria-hidden
            className="size-3.5 rounded-sm"
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </span>
      ))}
      <span className="hidden text-sm text-muted xl:inline">
        {messages.ww2.bordersNote}
      </span>
    </div>
  );
}
