import raw from "@/data/generated/campaigns.json";
import type { Locale } from "@/lib/types";
import { keepLocales } from "@/lib/localize";
import type { Campaign } from "./types";

/**
 * 서버(페이지)에서만 import한다. 클라이언트에는 그 페이지의 전쟁 하나만 props로 넘긴다
 * (전체 JSON이 브라우저 번들에 들어가지 않게).
 */
export const CAMPAIGNS = raw as unknown as Campaign[];
export const findCampaign = (id: string) => CAMPAIGNS.find((c) => c.id === id);

/**
 * 화면(브라우저)에 넘길 전쟁 하나: 전투마다 8개 언어 위키백과 요약이 붙어 있어(세계대전은 0.7MB)
 * 그 언어와 대체용 영어만 남긴다. logic.ts의 제목·설명 대체 순서(그 언어 → 영어)와 결과가 같다.
 */
export function localizeCampaign(c: Campaign, locale: Locale): Campaign {
  return {
    ...c,
    wiki: keepLocales(c.wiki, locale, ["en"]),
    battles: c.battles.map((b) => ({
      ...b,
      wiki: keepLocales(b.wiki, locale, ["en"]),
    })),
  };
}
