import type { Locale } from "@/lib/types";
import campaignIndex from "./generated/campaign-index.json";
import topicIndex from "./generated/topic-index.json";

/**
 * 본 지도 연도 슬라이더에 "이 시기에 이런 지도가 있다"를 보여주기 위한 표식.
 * 전쟁 지도(content/campaigns)와 주제 지도(content/topics)의 작은 색인만 읽는다(지도 데이터 자체는 읽지 않음).
 * 주제 지도가 늘어나면 띠(lane)도 자동으로 늘어난다.
 */
export type MapMarker = {
  key: string;
  /** 같은 띠에 놓이는 묶음: "wars" 또는 주제 지도 id */
  lane: string;
  /** 연도 범위 (한 해면 start === end) */
  start: number;
  end: number;
  titles: Partial<Record<Locale, string>>;
  fallback: string;
  /** 링크 경로(언어 접두사 제외) */
  path: string;
  importance: number;
};

export type MapLane = { id: string; color: string; titles: Partial<Record<Locale, string>> | null };

type CampaignEntry = {
  id: string;
  wikipedia: string;
  titles: Partial<Record<Locale, string>>;
  unit: "month" | "year";
  start: number;
  end: number;
  battles: number;
};
type TopicEntry = {
  id: string;
  order: number;
  color: string;
  title: Partial<Record<Locale, string>>;
  items: {
    id: string;
    start: number;
    end: number;
    importance: number;
    titles: Partial<Record<Locale, string>>;
    wikipedia: string;
  }[];
};

const toYear = (t: number, unit: "month" | "year") => (unit === "year" ? t : Math.floor(t / 12));

/** 띠 순서: 전쟁 지도 → 주제 지도(order 순). 전쟁 띠 이름은 화면 사전(wars.tab)을 쓰므로 null */
export const MAP_LANES: MapLane[] = [
  { id: "wars", color: "var(--side-a)", titles: null },
  ...(topicIndex as TopicEntry[]).map((t) => ({ id: t.id, color: t.color, titles: t.title })),
];

export const MAP_MARKERS: MapMarker[] = [
  ...(campaignIndex as CampaignEntry[]).map((c) => ({
    key: `wars:${c.id}`,
    lane: "wars",
    start: toYear(c.start, c.unit),
    end: toYear(c.end, c.unit),
    titles: c.titles,
    fallback: c.wikipedia,
    path: `wars/${c.id}`,
    importance: 5,
  })),
  ...(topicIndex as TopicEntry[]).flatMap((t) =>
    t.items.map((i) => ({
      key: `${t.id}:${i.id}`,
      lane: t.id,
      start: Math.floor(i.start / 12),
      end: Math.floor(i.end / 12),
      titles: i.titles,
      fallback: i.wikipedia,
      path: `maps/${t.id}?item=${i.id}`,
      importance: i.importance,
    })),
  ),
];

/** 기간 [from, to]에 걸치는 표식 (중요한 순) */
export function markersIn(from: number, to: number): MapMarker[] {
  return MAP_MARKERS.filter((m) => m.start <= to && m.end >= from).sort(
    (a, b) => b.importance - a.importance || a.start - b.start,
  );
}
