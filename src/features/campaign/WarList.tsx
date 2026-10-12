import type { Locale, RegionId } from "@/lib/types";
import type { Messages } from "@/i18n";
import { fill } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { VIEWPOINTS } from "@/data/viewpoints";
import index from "@/data/generated/campaign-index.json";
import { formatRange } from "./logic";
import type { Unit } from "./types";

type Item = {
  id: string;
  region: string;
  wikipedia: string;
  titles: Partial<Record<Locale, string>>;
  unit: Unit;
  start: number;
  end: number;
  battles: number;
};
const ITEMS = index as Item[];

/**
 * 전쟁 지도 목록(지역별). 대화상자와 /wars 페이지가 같이 쓴다.
 * 문구는 호출하는 쪽에서 messages로 넘긴다(클라이언트에 사전 전체가 실리지 않게).
 */
export function WarList({
  locale,
  messages,
  current,
}: {
  locale: Locale;
  messages: Messages;
  current?: string;
}) {
  // 지역 순서: 세계 → 지도 시점 순서(서→동)
  const order = [
    "world",
    ...VIEWPOINTS.flatMap((v) => v.regions.slice(0, 1)),
    ...Object.keys(messages.regions),
  ];
  const regions = [...new Set(order)].filter((r) =>
    ITEMS.some((c) => c.region === r),
  );
  const regionName = (r: string) =>
    r === "world" ? messages.wars.world : messages.regions[r as RegionId];

  return (
    <div className="space-y-8">
      {regions.map((r) => (
        <section key={r}>
          <h3 className="text-sm font-semibold tracking-[0.08em] text-muted uppercase">
            {regionName(r)}
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {ITEMS.filter((c) => c.region === r).map((c) => (
              <li key={c.id}>
                <a
                  href={localeHref(locale, `wars/${c.id}`)}
                  aria-current={c.id === current ? "page" : undefined}
                  className="block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-foreground/40 aria-[current=page]:border-foreground"
                >
                  <p className="text-lg font-bold">
                    {c.titles[locale] ?? c.titles.en ?? c.wikipedia}
                  </p>
                  <p className="mt-1 text-[15px] text-muted">
                    {formatRange(c.start, c.end, c.unit, locale)}
                  </p>
                  <p className="mt-1.5 text-sm text-muted">
                    {messages.wars.battles} ·{" "}
                    {fill(messages.wars.battleCount, { n: c.battles })}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
