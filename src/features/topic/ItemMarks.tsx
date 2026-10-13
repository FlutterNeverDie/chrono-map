"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { useTopic, useTopicState, useTopicStore } from "./store";
import {
  MAX_POS,
  itemColor,
  itemMarks,
  itemTitle,
  visibleItems,
} from "./logic";

/**
 * 슬라이더 바로 위 항목 표식: 전염병은 기간 막대, 발명은 눈금.
 * 큰 항목(중요도 5)은 진하고 굵게, 지금 지도에 보이는 항목은 강조. 누르면 그 항목으로 이동.
 */
export function ItemMarks() {
  const { locale } = useI18n();
  const topic = useTopic();
  const store = useTopicStore();
  const t = useTopicState((s) => s.t);
  const selected = useTopicState((s) => s.selected);
  const marks = useMemo(() => itemMarks(topic), [topic]);
  const now = useMemo(
    () => new Set(visibleItems(topic, t).map((i) => i.id)),
    [topic, t],
  );
  const pct = (p: number) => `${(p / MAX_POS) * 100}%`;

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-[calc(50%+7px)] z-10 h-4">
      {marks.map(({ item, from, to, row }) => {
        const big = item.importance >= 5;
        const on =
          item.id === selected || (topic.mode === "span" && now.has(item.id));
        return (
          <button
            key={item.id}
            type="button"
            tabIndex={-1}
            title={itemTitle(item, locale)}
            aria-label={itemTitle(item, locale)}
            onClick={() => {
              const s = store.getState();
              s.setT(item.start);
              s.select(item.id);
              s.focusOn(item.coords);
            }}
            className={clsx(
              "pointer-events-auto absolute -translate-x-px rounded-full transition-opacity hover:opacity-100",
              topic.mode === "span"
                ? "h-1"
                : big
                  ? "h-4 w-[3px]"
                  : "h-2.5 w-0.5",
              on ? "opacity-100" : big ? "opacity-70" : "opacity-35",
            )}
            style={{
              left: pct(from),
              width: topic.mode === "span" ? pct(to - from) : undefined,
              bottom: topic.mode === "span" ? row * 6 : 0,
              height: topic.mode === "span" && big ? 5 : undefined,
              backgroundColor: itemColor(topic, item.id),
            }}
          />
        );
      })}
    </div>
  );
}
