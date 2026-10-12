import type { RegionId } from "@/lib/types";

export type Region = {
  id: RegionId;
  /** 사건 카드·핀 색 */
  color: string;
};

/**
 * 사건 분류용 지역. 이름은 i18n 사전 regions.
 * 지도 위 나라 영역은 연도별 역사 국경(public/borders)을 쓰고, 이 지역과는 무관하다.
 */
export const REGIONS: Region[] = [
  { id: "korea", color: "#e11d48" },
  { id: "china", color: "#f97316" },
  { id: "japan", color: "#a855f7" },
  { id: "central-asia", color: "#ca8a04" },
  { id: "southeast-asia", color: "#22c55e" },
  { id: "india", color: "#14b8a6" },
  { id: "middle-east", color: "#ef4444" },
  { id: "europe", color: "#3b82f6" },
  { id: "africa", color: "#f59e0b" },
  { id: "north-america", color: "#10b981" },
  { id: "south-america", color: "#8b5cf6" },
  { id: "oceania", color: "#06b6d4" },
];

export const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));
