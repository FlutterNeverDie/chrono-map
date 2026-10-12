import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LanguageSelect } from "@/i18n/LanguageSelect";
import { YearDisplay, YearGauge } from "@/features/timeline";
import {
  Attribution,
  ViewpointBar,
  WorldMap,
  ZoomControls,
} from "@/features/map";
import { EventPanel } from "@/features/events";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * 메인 화면: 지도가 하단 바 위 영역을 모두 덮고, 나머지 UI는 그 위에 떠 있다.
 * --bar-h: 하단 바 높이. 모바일은 두 줄(게이지 / 설정), sm 이상은 한 줄.
 */
export function HomeScreen({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="relative h-dvh w-full overflow-hidden bg-[var(--map-ocean)] [--bar-h:calc(6.5rem+env(safe-area-inset-bottom))] sm:[--bar-h:calc(4.25rem+env(safe-area-inset-bottom))]">
        <div className="absolute inset-x-0 top-0 bottom-[var(--bar-h)]">
          <WorldMap />
        </div>

        {/* 상단: 연도 · 시점 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 p-3 lg:flex-row lg:items-start">
          <header className="pointer-events-auto w-fit rounded-lg border border-line bg-surface/95 px-3.5 py-2 backdrop-blur">
            <h1 className="text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
              {messages.siteName}
            </h1>
            <YearDisplay />
          </header>
          <div className="pointer-events-auto min-w-0 lg:absolute lg:inset-x-0 lg:top-3 lg:mx-auto lg:w-fit">
            <ViewpointBar />
          </div>
        </div>

        <div className="absolute start-3 top-36 z-20 lg:top-24">
          <ZoomControls />
        </div>

        <EventPanel />

        <div className="pointer-events-none absolute start-3 bottom-[calc(var(--bar-h)+0.5rem)] z-10 hidden lg:block">
          <Attribution />
        </div>

        {/* 하단 바: [언어 · 테마] [연도 게이지] */}
        <nav className="absolute inset-x-0 bottom-0 z-30 flex h-[var(--bar-h)] flex-col-reverse justify-end gap-1 border-t border-line bg-surface px-2 pt-2 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:items-start sm:gap-3 sm:px-3">
          <div className="flex shrink-0 items-center gap-0.5 sm:border-e sm:border-line sm:pe-3">
            <LanguageSelect />
            <ThemeToggle
              toDarkLabel={messages.ui.toDark}
              toLightLabel={messages.ui.toLight}
            />
          </div>
          <YearGauge className="w-full sm:flex-1" />
        </nav>
      </div>
    </I18nProvider>
  );
}
