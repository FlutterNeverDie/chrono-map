import type { Locale, WikiPage } from "@/lib/types";

/**
 * 전쟁 지도 데이터 (content/campaigns/<id>/ → npm run wars:build → src/data/generated/campaigns.json).
 * 시간값 t: unit이 "month"면 월 번호(연×12 + 월−1), "year"면 연도.
 */
export type Unit = "month" | "year";
export type SideKey = "a" | "b" | "n";
export type SideRule = {
  name: string;
  side: SideKey;
  from: number | null;
  to: number | null;
};

export type Battle = {
  id: string;
  wikipedia: string;
  start: number;
  end: number;
  coords: [number, number];
  /** 위키백과 언어판 수 — 중요도 */
  links: number;
  wiki: Partial<Record<Locale, WikiPage>>;
};

export type Campaign = {
  id: string;
  wikipedia: string;
  /** 지역 id(data/regions) 또는 "world" */
  region: string;
  unit: Unit;
  start: number;
  end: number;
  startYear: number;
  endYear: number;
  view: { lon: number; lat: number; zoom: number };
  /** 진영 이름(a, b). 없으면 진영을 나누지 않고 나라별 색 */
  sides: Partial<Record<"a" | "b", Partial<Record<Locale, string>>>>;
  sideRules: SideRule[];
  wiki: Partial<Record<Locale, WikiPage>>;
  battles: Battle[];
  borderYears: number[];
};
