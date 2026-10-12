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
  | "korea"
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

/** 언어별 문자열. 한국어는 필수, 나머지는 없으면 영어 → 한국어 순으로 대체 */
export type Localized = { ko: string } & Partial<
  Record<Exclude<Locale, "ko">, string>
>;

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
  title: Localized;
  place: Localized;
  summary: Localized;
  sources: string[];
};

/** 시점별 "중요한 사건 순서"(사건 id 배열, 앞이 더 중요). content/rankings/*.txt에서 생성 */
export type Rankings = Partial<Record<ViewpointId, string[]>>;

export type Content = { events: HistoryEvent[]; rankings: Rankings };
