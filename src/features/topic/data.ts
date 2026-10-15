import raw from "@/data/generated/topics.json";
import type { Locale } from "@/lib/types";
import { keepLocales } from "@/lib/localize";
import type { Topic } from "./types";

/** 서버(페이지)에서만 import한다. 클라이언트에는 그 페이지의 주제 지도 하나만 props로 넘긴다 */
export const TOPICS = raw as unknown as Topic[];
export const findTopic = (id: string) => TOPICS.find((t) => t.id === id);

/**
 * 화면(브라우저)에 넘길 주제 지도 하나: 항목마다 8개 언어 위키백과 요약이 붙어 있어(1MB 넘음)
 * 그 언어와 대체용 언어만 남긴다. logic.ts의 대체 순서와 결과가 같다.
 */
export function localizeTopic(t: Topic, locale: Locale): Topic {
  return {
    ...t,
    title: keepLocales(t.title, locale),
    description: keepLocales(t.description, locale),
    linkLabel: t.linkLabel && keepLocales(t.linkLabel, locale),
    items: t.items.map((i) => ({
      ...i,
      wiki: keepLocales(i.wiki, locale, ["en"]),
      title: i.title && keepLocales(i.title, locale, ["en"]),
      summary: i.summary && keepLocales(i.summary, locale),
    })),
  };
}
