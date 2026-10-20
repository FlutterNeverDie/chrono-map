import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { I18nProvider } from "@/i18n/I18nProvider";
import {
  TopicGauge,
  TopicMap,
  TopicPanel,
  TopicProvider,
  type Topic,
} from "@/features/topic";
import { localizeTopic } from "@/features/topic/data";
import { BottomBar } from "./BottomBar";
import { AdSlot } from "@/features/ads";

/** 주제 지도 화면 (/maps/[id]) — 역병·발명 등, 그리고 전쟁 지도 첫 화면(/wars). 페이지가 고른 지도 하나만 클라이언트로 넘긴다 */
export function TopicScreen({
  locale,
  topic,
  section = `map:${topic.id}`,
}: {
  locale: Locale;
  topic: Topic;
  /** 상단 탭에서 강조할 곳 (전쟁 지도 첫 화면은 "wars") */
  section?: string;
}) {
  const messages = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <TopicProvider topic={localizeTopic(topic, locale)}>
        <div className="relative h-dvh w-full touch-pan-x touch-pan-y overflow-hidden bg-[var(--map-ocean)] [--bar-h:calc(4.25rem+max(env(safe-area-inset-bottom)-10px,0px))] lg:[--bar-h:calc(5.75rem+env(safe-area-inset-bottom))] [--top-h:0rem]">
          <div className="absolute inset-x-0 top-0 bottom-[var(--bar-h)]">
            <TopicMap />
          </div>

          <TopicPanel ad={<AdSlot name="infeed" />} />
          <div className="pointer-events-none absolute start-3 bottom-[calc(var(--bar-h)+0.5rem)] z-10 hidden rounded bg-surface/70 px-1.5 py-0.5 text-xs text-muted lg:block">
            {messages.ui.wikipedia} · CC BY-SA 4.0 · Cliopatria (Seshat) · CC BY
            4.0
          </div>
          <BottomBar current={section}>
            <TopicGauge />
          </BottomBar>
        </div>
      </TopicProvider>
    </I18nProvider>
  );
}
