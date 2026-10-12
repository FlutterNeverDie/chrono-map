import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { I18nProvider } from "@/i18n/I18nProvider";
import { BattlePanel, Legend, MonthGauge, Ww2Map } from "@/features/ww2";
import { SiteHeader } from "./SiteHeader";

/** 2차대전 지도 화면 (/ww2). 본 지도(HomeScreen)와 같은 틀이지만 기능 코드는 features/ww2만 쓴다 */
export function Ww2Screen({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="relative h-dvh w-full overflow-hidden bg-[var(--map-ocean)] [--bar-h:calc(5.75rem+env(safe-area-inset-bottom))]">
        <div className="absolute inset-x-0 top-0 bottom-[var(--bar-h)]">
          <Ww2Map />
        </div>
        <SiteHeader current="ww2">
          <Legend />
        </SiteHeader>
        <BattlePanel />
        <div className="pointer-events-none absolute start-3 bottom-[calc(var(--bar-h)+0.5rem)] z-10 hidden rounded bg-surface/70 px-1.5 py-0.5 text-xs text-muted lg:block">
          Cliopatria (Seshat) · CC BY 4.0 · {messages.ui.wikipedia} · CC BY-SA
          4.0
        </div>
        <nav className="absolute inset-x-0 bottom-0 z-30 flex h-[var(--bar-h)] items-start border-t border-line bg-surface px-2 pt-3 pb-[env(safe-area-inset-bottom)] sm:px-4">
          <MonthGauge />
        </nav>
      </div>
    </I18nProvider>
  );
}
