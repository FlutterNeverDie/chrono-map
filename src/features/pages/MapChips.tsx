import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { localeHref } from "@/i18n/locales";
import { pick } from "@/lib/localize";
import { MAP_LANES, type MapMarker } from "@/data/mapMarkers";

/** "이 시기의 다른 지도": 전쟁·주제 지도 링크 목록(연도 페이지·사건 상세 공통) */
export function MapChips({
  locale,
  maps,
}: {
  locale: Locale;
  maps: MapMarker[];
}) {
  if (!maps.length) return null;
  const messages = getMessages(locale);
  const lane = (id: string) => MAP_LANES.find((l) => l.id === id)!;
  return (
    <>
      <h2 className="mt-10 text-xl font-bold">{messages.ui.otherMaps}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {maps.map((m) => {
          const l = lane(m.lane);
          return (
            <li key={m.key}>
              <a
                href={localeHref(locale, m.path)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 py-1.5 text-base hover:border-foreground/40"
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-muted">
                  {l.titles ? pick(l.titles, locale) : messages.wars.tab}
                </span>
                <span className="font-semibold">
                  {pick(m.titles, locale) || m.fallback}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
