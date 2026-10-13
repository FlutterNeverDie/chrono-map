import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { I18nProvider } from "@/i18n/I18nProvider";
import { YearGauge } from "@/features/timeline";
import {
  Attribution,
  ViewpointBar,
  ViewpointMenu,
  WorldMap,
} from "@/features/map";
import { EventPanel } from "@/features/events";
import { EventsProvider } from "@/store/events";
import { localizeEvent } from "@/lib/localize";
import { EVENTS, RANKINGS } from "@/data/content";
import { SiteHeader } from "./SiteHeader";

/**
 * 메인 화면(크로노맵): 지도가 하단 바 위 영역을 모두 덮고, 나머지 UI는 그 위에 떠 있다.
 * --bar-h: 하단 연도 바 높이. 지도·사건 패널·출처 표기가 이 값 위에 놓인다.
 */
export function HomeScreen({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      {/* 사건은 이 언어에 필요한 부분만 브라우저로 보낸다 */}
      <EventsProvider
        events={EVENTS.map((e) => localizeEvent(e, locale))}
        rankings={RANKINGS}
      >
        <div className="relative h-dvh w-full overflow-hidden bg-[var(--map-ocean)] [--bar-h:calc(5.75rem+env(safe-area-inset-bottom))] [--top-h:calc(max(0.5rem,env(safe-area-inset-top))+3rem)]">
          <div className="absolute inset-x-0 top-0 bottom-[var(--bar-h)]">
            <WorldMap />
          </div>

          <SiteHeader current="chronomap" mobileTool={<ViewpointMenu />}>
            <ViewpointBar />
          </SiteHeader>

          <EventPanel />

          <div className="pointer-events-none absolute start-3 bottom-[calc(var(--bar-h)+0.5rem)] z-10 hidden lg:block">
            <Attribution />
          </div>

          <nav className="absolute inset-x-0 bottom-0 z-30 flex h-[var(--bar-h)] items-start border-t border-line bg-surface px-2 pt-3 pb-[env(safe-area-inset-bottom)] sm:px-4">
            <YearGauge className="w-full" />
          </nav>
        </div>
      </EventsProvider>
    </I18nProvider>
  );
}
