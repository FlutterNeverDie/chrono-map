"use client";

import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { useCampaign, useCampaignState } from "./store";
import { battlesAt, formatTime } from "./logic";

/**
 * 상단 바(전쟁 이름·범례) 아래 왼쪽 "1942년 7월 · 전투 · 3건" - 본 지도 제목 상자(features/events MapTitle)와 같은 모양.
 * 수는 지금 시기의 전투(목록 "이 시기"와 같음). 지도 조작을 막지 않는다(pointer-events-none).
 */
export function CampaignTitle() {
  const { locale, messages } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const count = battlesAt(c, t).length;
  return (
    <div
      data-map-top
      className="pointer-events-none absolute start-3 top-[calc(var(--top-h)+0.25rem)] z-10 max-w-[calc(100%-5.25rem)] rounded-lg bg-background/92 px-3 py-1.5 shadow-sm lg:max-w-[calc(100%-36rem)] xl:max-w-[calc(100%-42rem)] 2xl:max-w-[calc(100%-48rem)]"
    >
      <p className="text-lg leading-tight font-bold lg:text-2xl">
        {formatTime(t, c.unit, locale)}
      </p>
      <p className="text-sm text-muted lg:text-base">
        {messages.wars.battles} ·{" "}
        {fill(messages.wars.battleCount, { n: count })}
      </p>
    </div>
  );
}
