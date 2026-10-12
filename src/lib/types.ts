export type ContinentId =
  | "asia"
  | "europe"
  | "africa"
  | "north-america"
  | "south-america"
  | "oceania";

export type CategoryId =
  | "war"
  | "politics"
  | "science"
  | "culture"
  | "religion"
  | "economy"
  | "exploration";

export type Localized = { ko: string; en?: string };

export type HistoryEvent = {
  id: string;
  title: Localized;
  /** 기원전은 음수 (기원전 221년 = -221) */
  year: number;
  endYear?: number | null;
  precision: "year" | "decade" | "century";
  continent: ContinentId;
  region: string;
  /** [경도, 위도] */
  coords: [number, number];
  category: CategoryId;
  importance: 1 | 2 | 3 | 4 | 5;
  summary: Localized;
  sources: string[];
};
