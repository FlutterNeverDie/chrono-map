export type Locale = "ko" | "en" | "zh" | "es" | "hi" | "ar" | "fr" | "pt";

/** 지도·카드에서 묶어 보여주는 지역 단위. 목록은 data/regions.ts */
export type RegionId =
  | "korea"
  | "china"
  | "japan"
  | "central-asia"
  | "southeast-asia"
  | "india"
  | "middle-east"
  | "europe"
  | "africa"
  | "north-america"
  | "south-america"
  | "oceania";

/** 지도 시점. 목록·경도는 data/viewpoints.ts */
export type ViewpointId =
  | "east-asia"
  | "central-asia"
  | "west-asia"
  | "eastern-europe"
  | "western-europe"
  | "north-america"
  | "south-america"
  | "oceania";

/** 목록은 data/categories.ts */
export type CategoryId =
  | "war"
  | "politics"
  | "science"
  | "culture"
  | "religion"
  | "economy"
  | "exploration";

/** 연도가 얼마나 정확한가. year가 아니면 "약 ~"으로 표시 */
export type Precision = "year" | "decade" | "century";

/** 언어별 문자열. 있는 언어만 채운다(없으면 영어 → 한국어 순으로 대체 표시, lib/localize.ts) */
export type LocalizedText = Partial<Record<Locale, string>>;

/** 위키백과 문서 요약 하나 (REST API page/summary 결과 그대로) */
export type WikiPage = {
  /** 그 언어 위키백과의 문서 제목 */
  title: string;
  /** 문서 첫 문단 (가공하지 않은 원문) */
  extract: string;
  /** 문서 주소 — 출처 표기(CC BY-SA 4.0)에 쓴다 */
  url: string;
};

export type HistoryEvent = {
  id: string;
  /**
   * 기간. 기원전은 음수(기원전 221년 = -221), 0년은 없다.
   * 한 해에 일어난 사건은 start === end, 기간 사건(전쟁·왕조 등)은 start < end.
   */
  start: number;
  end: number;
  precision: Precision;
  region: RegionId;
  /** [경도, 위도] */
  coords: [number, number];
  category: CategoryId;
  /** 세계사 전체 기준 중요도 1~5. 시점별 순서가 없을 때 정렬 기준 */
  importance: 1 | 2 | 3 | 4 | 5;
  /** 내용의 출처가 되는 영어 위키백과 문서 제목 (예: "Apollo 11") */
  wikipedia?: string;
  /** 언어별 위키백과 요약 (`npm run wiki`로 받아 둔 content/wikipedia.json에서 채움) */
  wiki: Partial<Record<Locale, WikiPage>>;
  /** 직접 쓴 제목 — 있으면 위키백과 문서 제목보다 우선 (사건다운 이름이 필요할 때) */
  title: LocalizedText;
  place: LocalizedText;
  /** 직접 쓴 요약 — 위키백과 요약이 없는 언어에서만 쓴다 */
  summary: LocalizedText;
  /** 위키백과 외 추가 출처 */
  sources: string[];
  /** 같은 위키백과 문서를 쓰는 전쟁 지도(/wars/<id>)가 있으면 그 id (빌드 때 자동 연결) */
  campaign?: string;
};

/** 시점별 "중요한 사건 순서"(사건 id 배열, 앞이 더 중요). content/rankings/*.txt에서 생성 */
export type Rankings = Partial<Record<ViewpointId, string[]>>;

export type Content = {
  events: HistoryEvent[];
  rankings: Rankings;
  /** 사건 중 가장 늦은 연도 — 연도 슬라이더의 끝 */
  lastYear: number;
};
