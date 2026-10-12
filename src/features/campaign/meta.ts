import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { findCampaign } from "./data";
import { campaignTitle, formatRange } from "./logic";

/** 전쟁 지도 페이지 제목·설명 (검색 노출용) */
export function campaignMetadata(locale: Locale, id: string) {
  const c = findCampaign(id);
  if (!c) return {};
  const m = getMessages(locale);
  const title = campaignTitle(c, locale);
  const extract =
    (c.wiki[locale] ?? c.wiki.en)?.extract ?? m.wars.indexDescription;
  return {
    title: `${title} (${formatRange(c.start, c.end, c.unit, locale)}) — ${m.wars.tab} · ${m.siteName}`,
    description: extract.slice(0, 160),
  };
}
