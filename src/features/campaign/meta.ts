import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { clipText } from "@/lib/localize";
import { pageAlternates } from "@/i18n/alternates";
import { findCampaign } from "./data";
import { campaignSummary, campaignTitle, formatRange } from "./logic";

/** 전쟁 지도 페이지 제목·설명 (검색 노출용) */
export function campaignMetadata(locale: Locale, id: string) {
  const c = findCampaign(id);
  if (!c) return {};
  const m = getMessages(locale);
  const title = campaignTitle(c, locale);
  const extract = campaignSummary(c, locale).text || m.wars.indexDescription;
  return {
    title: `${title} (${formatRange(c.start, c.end, c.unit, locale)}) — ${m.wars.tab} · ${m.siteName}`,
    description: clipText(extract),
    alternates: pageAlternates(locale, `wars/${id}`),
  };
}

/** 전쟁 지도 첫 화면(/wars) 제목·설명 */
export function warsMetadata(locale: Locale) {
  const m = getMessages(locale);
  return {
    title: `${m.wars.indexTitle} — ${m.siteName}`,
    description: m.wars.indexDescription,
    alternates: pageAlternates(locale, "wars"),
  };
}
