import type { Locale, WikiPage } from "@/lib/types";

/**
 * 주제 지도 데이터 (content/topics/<id>/ → npm run topics:build → src/data/generated/topics.json).
 * 시간값 t = 월 번호(연×12 + 월−1).
 */
export type SpreadPoint = { t: number; coords: [number, number] };

export type TopicItem = {
  id: string;
  wikipedia: string;
  start: number;
  end: number;
  /** 대략적인 시기(선사시대 등) → "약 ~" */
  approx: boolean;
  coords: [number, number];
  /** 발원지에서 퍼져 나간 지점(전염병) */
  spread: SpreadPoint[];
  importance: number;
  wiki: Partial<Record<Locale, WikiPage>>;
  /** (선택) 직접 쓴 제목·설명 — 그 언어 위키백과 문서가 없을 때(items.txt의 title.<언어>, summary.<언어>) */
  title?: Partial<Record<Locale, string>>;
  summary?: Partial<Record<Locale, string>>;
  /** (선택) 더 자세한 지도로 가는 경로(언어 접두어 없이, 예: "wars/imjin-war") */
  link?: string;
  /** (선택) 상세 페이지 경로(언어 접두어 없이). 없으면 maps/<지도>/<항목> - 전쟁 목록(/wars)은 wars/<id>/about */
  page?: string;
};

/**
 * 항목 안의 작은 점(전쟁 목록 /wars의 전투): 그 기간(월 번호)에만 보인다. 이름·때는 그 언어로 미리 적어 둔 글자.
 * 점이 많아 페이지 HTML에 넣지 않고 지도가 따로 받는다(Topic.points.url)
 */
export type TopicPoint = {
  id: string;
  item: string;
  start: number;
  end: number;
  coords: [number, number];
  title: string;
  when: string;
};

export type Topic = {
  id: string;
  order: number;
  /** span: 기간 동안만 보임 · persist: 생긴 뒤 계속 남음 */
  mode: "span" | "persist";
  /** 슬라이더 눈금 연도 — 같은 간격으로 놓는 비선형 축 */
  scale: number[];
  showMonthFrom: number | null;
  view: { lon: number; lat: number; zoom: number };
  color: string;
  /** 하단 바 지도 아이콘 이름(topic.txt의 icon) */
  icon?: string;
  title: Partial<Record<Locale, string>>;
  description: Partial<Record<Locale, string>>;
  items: TopicItem[];
  /**
   * (선택) 항목 안의 작은 점 파일. url의 {locale}은 언어, 파일은 { items: 항목 id[], points: [항목 번호, id, 시작, 끝, 경도, 위도, 이름, 때][] }.
   * link는 점을 골랐을 때 가는 경로({item}·{id} 자리, 언어 접두어 없이)
   */
  points?: {
    url: string;
    link: string;
    label: Partial<Record<Locale, string>>;
  };
  /** (선택) 항목 link 버튼 문구 */
  linkLabel?: Partial<Record<Locale, string>>;
  /** (선택) 처음 시점(월 번호). 없으면 `startT`가 항목으로 정한다 - 전쟁 목록은 전투가 가장 많은 해 */
  start?: number;
};
