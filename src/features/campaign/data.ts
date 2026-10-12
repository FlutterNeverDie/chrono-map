import raw from "@/data/generated/campaigns.json";
import type { Campaign } from "./types";

/**
 * 서버(페이지)에서만 import한다. 클라이언트에는 그 페이지의 전쟁 하나만 props로 넘긴다
 * (전체 JSON이 브라우저 번들에 들어가지 않게).
 */
export const CAMPAIGNS = raw as unknown as Campaign[];
export const findCampaign = (id: string) => CAMPAIGNS.find((c) => c.id === id);
