"use client";

import { useMemo } from "react";
import { useTimeline } from "@/store/timeline";
import { eventsByContinent } from "@/lib/events";
import { formatYear, formatYearRange } from "@/lib/year";
import { CONTINENTS } from "@/data/continents";
import type { HistoryEvent } from "@/lib/types";
import rawEvents from "@/data/events.json";

const events = rawEvents as HistoryEvent[];

export function ContinentCards() {
  const year = useTimeline((s) => s.year);
  const grouped = useMemo(() => eventsByContinent(events, year), [year]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {CONTINENTS.map((c) => {
        const list = grouped.get(c.id) ?? [];
        return (
          <section
            key={c.id}
            className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <span
                aria-hidden
                className="size-3 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-neutral-500">이 시기 등록된 사건이 없어요</p>
            ) : (
              <ul className="space-y-3">
                {list.map((e) => (
                  <li key={e.id}>
                    <p className="text-xs text-neutral-500">
                      {e.endYear
                        ? formatYearRange(e.year, e.endYear)
                        : formatYear(e.year, e.precision !== "year")}{" "}
                      · {e.region}
                    </p>
                    <p className="font-medium">{e.title.ko}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {e.summary.ko}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
