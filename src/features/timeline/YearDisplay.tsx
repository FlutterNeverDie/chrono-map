"use client";

import { useTimeline } from "@/store/timeline";
import { formatYear } from "@/lib/year";
import eras from "@/data/eras.json";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n";

export function YearDisplay() {
  const { locale, messages } = useI18n();
  const year = useTimeline((s) => s.year);
  const era = eras.findLast((e) => year >= e.start);
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold tabular-nums sm:text-3xl">
        {formatYear(year, locale)}
      </span>
      {era && (
        <span className="text-sm text-muted">
          {messages.eras[era.id as keyof Messages["eras"]]}
        </span>
      )}
    </div>
  );
}
