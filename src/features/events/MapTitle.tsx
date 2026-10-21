"use client";

import { usePeriod } from "@/store/timeline";
import { formatPeriod } from "@/lib/period";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { useRankedEvents } from "./EventList";

/**
 * 지도 왼쪽 위 제목 "1940년대의 세계 · 사건 61건". 처음 들어온 사람이 "시대별 세계지도"임을 바로 알게,
 * 슬라이더를 끌면 같이 바뀌어 만지는 법도 알려 준다. 지도 조작을 막지 않는다(pointer-events-none).
 * 휴대폰은 오른쪽 위 나침반·처음 안내(features/map HeadingControl) 자리만큼 폭을 비운다.
 */
export function MapTitle() {
  const { locale, messages } = useI18n();
  const period = usePeriod();
  const count = useRankedEvents().length;
  return (
    <div
      data-map-top
      className="pointer-events-none absolute start-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 max-w-[calc(100%-5.25rem)] rounded-lg bg-background/92 px-3 py-1.5 shadow-sm lg:max-w-[calc(100%-36rem)] xl:max-w-[calc(100%-42rem)] 2xl:max-w-[calc(100%-48rem)]"
    >
      <p className="text-lg leading-tight font-bold lg:text-2xl">
        {fill(messages.ui.worldIn, { p: formatPeriod(period, locale) })}
      </p>
      <p className="text-sm text-muted lg:text-base">
        {messages.ui.events} · {fill(messages.ui.eventCount, { n: count })}
      </p>
    </div>
  );
}
