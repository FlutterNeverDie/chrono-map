"use client";

import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";
import { pick } from "@/lib/localize";
import type { Period } from "@/lib/period";
import { MAX_POSITION } from "@/lib/timeScale";
import { MAP_LANES, MAP_MARKERS } from "@/data/mapMarkers";
import { MAX_YEAR, MIN_YEAR, TIME_SCALE } from "@/data/timeline";

/**
 * 슬라이더 위에 쌓는 얇은 띠: 띠 하나 = 지도 종류 하나(전쟁 지도, 각 주제 지도).
 * 그 지도에 내용이 있는 시기에 색 막대(기간) 또는 눈금(한 해)을 그린다. 누르면 그 지도로 간다.
 * 지금 선택한 기간과 겹치는 표식은 진하게.
 */
export function MapLanes({ period }: { period: Period }) {
  const { locale, messages } = useI18n();
  const pct = (year: number) =>
    (TIME_SCALE.yearToPosition(Math.min(MAX_YEAR, Math.max(MIN_YEAR, year))) /
      MAX_POSITION) *
    100;
  const laneName = (id: string) => {
    const lane = MAP_LANES.find((l) => l.id === id);
    return lane?.titles ? pick(lane.titles, locale) : messages.wars.tab;
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-2 top-0 flex flex-col gap-[3px] pt-px"
    >
      {MAP_LANES.map((lane) => (
        <div key={lane.id} className="relative h-[5px]">
          {MAP_MARKERS.filter(
            (m) => m.lane === lane.id && m.end >= MIN_YEAR,
          ).map((m) => {
            const left = pct(m.start);
            const width = Math.max(pct(m.end) - left, 0.35);
            const on = m.start <= period.end && m.end >= period.start;
            const title = `${laneName(lane.id)} · ${pick(m.titles, locale) || m.fallback}`;
            return (
              <a
                key={m.key}
                href={localeHref(locale, m.path)}
                title={title}
                tabIndex={-1}
                className={clsx(
                  "pointer-events-auto absolute top-0 h-full rounded-full transition-opacity hover:opacity-100",
                  on ? "opacity-100" : "opacity-35",
                )}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: lane.color,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
