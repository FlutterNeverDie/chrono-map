import { YearDisplay, YearGauge } from "@/features/timeline";
import { ContinentCards } from "@/features/events";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* 데스크톱: 좌측 세로 게이지 */}
      <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 border-r border-neutral-200 py-6 pr-6 pl-2 md:block dark:border-neutral-800">
        <YearGauge orientation="vertical" />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-background/90 px-4 py-3 backdrop-blur dark:border-neutral-800">
          <p className="text-sm font-semibold text-amber-600">크로노맵</p>
          <YearDisplay />
        </header>

        {/* 모바일은 하단 게이지 높이만큼 여백 */}
        <main className="flex-1 px-4 py-4 pb-36 md:pb-8">
          <ContinentCards />
        </main>
      </div>

      {/* 모바일: 하단 가로 게이지 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-background px-3 pt-2 pb-[calc(1.75rem+env(safe-area-inset-bottom))] md:hidden dark:border-neutral-800">
        <YearGauge orientation="horizontal" />
      </nav>
    </div>
  );
}
