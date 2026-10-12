import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { pick } from "@/lib/localize";
import { findTopic } from "./data";

/** 주제 지도 페이지 제목·설명 (검색 노출용) */
export function topicMetadata(locale: Locale, id: string) {
  const t = findTopic(id);
  if (!t) return {};
  return {
    title: `${pick(t.title, locale)} — ${getMessages(locale).siteName}`,
    description: pick(t.description, locale),
  };
}
