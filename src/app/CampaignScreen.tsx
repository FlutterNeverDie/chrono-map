import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { I18nProvider } from "@/i18n/I18nProvider";
import {
  BattlePanel,
  CampaignMap,
  CampaignProvider,
  Legend,
  TimeGauge,
  type Campaign,
} from "@/features/campaign";
import { localizeCampaign } from "@/features/campaign/data";
import { SiteHeader } from "./SiteHeader";
import { BottomBar } from "./BottomBar";
import { AdSlot } from "@/features/ads";

/** 전쟁 지도 화면 (/wars/[id]). 페이지가 고른 전쟁 하나만 클라이언트로 넘긴다 */
export function CampaignScreen({
  locale,
  campaign,
}: {
  locale: Locale;
  campaign: Campaign;
}) {
  const messages = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <CampaignProvider campaign={localizeCampaign(campaign, locale)}>
        <div className="relative h-dvh w-full touch-pan-x touch-pan-y overflow-hidden bg-[var(--map-ocean)] [--bar-h:calc(6.3rem+env(safe-area-inset-bottom))] lg:[--bar-h:calc(5.75rem+env(safe-area-inset-bottom))] [--top-h:calc(max(0.5rem,env(safe-area-inset-top))+3rem)]">
          <div className="absolute inset-x-0 top-0 bottom-[var(--bar-h)]">
            <CampaignMap />
          </div>
          <SiteHeader>
            <Legend />
          </SiteHeader>
          <BattlePanel ad={<AdSlot name="infeed" />} />
          <div className="pointer-events-none absolute start-3 bottom-[calc(var(--bar-h)+0.5rem)] z-10 hidden rounded bg-surface/70 px-1.5 py-0.5 text-xs text-muted lg:block">
            Cliopatria (Seshat) · CC BY 4.0 · {messages.ui.wikipedia} · CC BY-SA
            4.0
          </div>
          <BottomBar current="wars">
            <TimeGauge />
          </BottomBar>
        </div>
      </CampaignProvider>
    </I18nProvider>
  );
}
