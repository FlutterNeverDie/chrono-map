"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { pick } from "@/lib/localize";
import { localeHref } from "@/i18n/locales";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { useCampaign } from "./store";
import { campaignTitle, hasSides } from "./logic";

/** ‹ 목록으로 + 전쟁 이름 + 진영 색 범례 (진영이 없으면 "나라별 색") */
export function Legend() {
  const { locale, messages } = useI18n();
  const c = useCampaign();
  const items = hasSides(c)
    ? [
        { color: "var(--side-a)", label: pick(c.sides.a ?? {}, locale) },
        ...(c.sides.b
          ? [{ color: "var(--side-b)", label: pick(c.sides.b, locale) }]
          : []),
        { color: "var(--side-n)", label: messages.wars.others },
      ]
    : [];
  return (
    <div className="flex h-11 w-fit max-w-full items-center gap-3 overflow-x-auto rounded-lg border border-line bg-surface/95 px-3 text-[15px] backdrop-blur [scrollbar-width:none] lg:h-12 lg:gap-4 lg:px-4">
      {/* 전쟁 하나를 보다가 전쟁 지도 목록(/wars)으로 돌아가는 길 */}
      <a
        href={localeHref(locale, "wars")}
        aria-label={messages.wars.backToList}
        title={messages.wars.backToList}
        className="-ms-1.5 flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-chip hover:text-foreground"
      >
        <ChevronLeftIcon className="size-5 rtl:-scale-x-100" />
      </a>
      <strong className="shrink-0 whitespace-nowrap">
        {campaignTitle(c, locale)}
      </strong>
      {items.map((i) => (
        <span
          key={i.label}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
        >
          <span
            aria-hidden
            className="size-3.5 rounded-sm"
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </span>
      ))}
      {!items.length && (
        <span className="shrink-0 text-muted">
          {messages.wars.polityColors}
        </span>
      )}
    </div>
  );
}
