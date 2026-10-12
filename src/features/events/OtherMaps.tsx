"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";
import { pick } from "@/lib/localize";
import { usePeriod } from "@/store/timeline";
import { MAP_LANES, markersIn } from "@/data/mapMarkers";

/** "이 시기의 다른 지도": 선택 기간에 내용이 있는 전쟁·주제 지도 바로가기 (최대 4개) */
export function OtherMaps() {
  const { locale, messages } = useI18n();
  const period = usePeriod();
  const markers = markersIn(period.start, period.end).slice(0, 4);
  if (!markers.length) return null;
  const lane = (id: string) => MAP_LANES.find((l) => l.id === id)!;

  return (
    <div className="px-3 pb-3">
      <p className="mb-1.5 px-1 text-sm font-semibold text-muted lg:text-[15px]">
        {messages.ui.otherMaps}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {markers.map((m) => {
          const l = lane(m.lane);
          return (
            <li key={m.key}>
              <a
                href={localeHref(locale, m.path)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[15px] hover:border-foreground/40 lg:text-base"
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-muted">
                  {l.titles ? pick(l.titles, locale) : messages.wars.tab}
                </span>
                <span className="font-semibold">
                  {pick(m.titles, locale) || m.fallback}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
