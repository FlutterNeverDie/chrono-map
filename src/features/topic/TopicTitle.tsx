"use client";

import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { useTopic, useTopicState } from "./store";
import { formatT, topicTitle, visibleItems } from "./logic";

/**
 * 지도 왼쪽 위 제목 "1347년 10월 · 역병 지도 · 4건" - 본 지도 제목 상자(features/events MapTitle)와 같은 모양.
 * 수는 지금 지도에 보이는 항목. 지도 조작을 막지 않는다(pointer-events-none).
 */
export function TopicTitle() {
  const { locale, messages } = useI18n();
  const topic = useTopic();
  const t = useTopicState((s) => s.t);
  const count = visibleItems(topic, t).length;
  return (
    <div
      data-map-top
      className="pointer-events-none absolute start-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 max-w-[calc(100%-5.25rem)] rounded-lg bg-background/92 px-3 py-1.5 shadow-sm lg:max-w-[calc(100%-36rem)] xl:max-w-[calc(100%-42rem)] 2xl:max-w-[calc(100%-48rem)]"
    >
      <p className="text-lg leading-tight font-bold lg:text-2xl">
        {formatT(t, topic, locale)}
      </p>
      <p className="text-sm text-muted lg:text-base">
        {topicTitle(topic, locale)} · {fill(messages.maps.count, { n: count })}
      </p>
    </div>
  );
}
