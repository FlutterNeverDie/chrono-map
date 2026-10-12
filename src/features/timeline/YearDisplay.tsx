"use client";

import { useTimeline } from "@/store/timeline";
import { formatYear } from "@/lib/year";
import eras from "@/data/eras.json";

export function YearDisplay() {
  const year = useTimeline((s) => s.year);
  const era = eras.findLast((e) => year >= e.start);
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold tabular-nums">{formatYear(year)}</span>
      {era && <span className="text-sm text-neutral-500">{era.name}</span>}
    </div>
  );
}
