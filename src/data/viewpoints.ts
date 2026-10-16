import type { Locale, RegionId, ViewpointId } from "@/lib/types";

export type Viewpoint = {
  id: ViewpointId;
  /** 화면 가운데로 올 경도 */
  lon: number;
  /** 이 시점에서 가까운(관련 깊은) 지역 순서. 시점별 순서 데이터가 없을 때 정렬에 쓴다 */
  regions: RegionId[];
};

/** 지도 시점 8개. 이름은 i18n 사전 viewpoints. 화면 버튼 순서 = 아래 경도 순(지도 왼쪽 → 오른쪽) */
const ALL_VIEWPOINTS: Viewpoint[] = [
  {
    id: "east-asia",
    lon: 112,
    regions: [
      "china",
      "korea",
      "japan",
      "central-asia",
      "southeast-asia",
      "india",
      "middle-east",
      "europe",
      "oceania",
      "north-america",
      "africa",
      "south-america",
    ],
  },
  {
    id: "central-asia",
    lon: 68,
    regions: [
      "central-asia",
      "middle-east",
      "china",
      "india",
      "europe",
      "korea",
      "japan",
      "southeast-asia",
      "africa",
      "oceania",
      "north-america",
      "south-america",
    ],
  },
  {
    id: "west-asia",
    lon: 45,
    regions: [
      "middle-east",
      "central-asia",
      "africa",
      "europe",
      "india",
      "china",
      "southeast-asia",
      "korea",
      "japan",
      "oceania",
      "north-america",
      "south-america",
    ],
  },
  {
    id: "eastern-europe",
    lon: 28,
    regions: [
      "europe",
      "middle-east",
      "central-asia",
      "africa",
      "india",
      "china",
      "north-america",
      "korea",
      "japan",
      "southeast-asia",
      "south-america",
      "oceania",
    ],
  },
  {
    id: "western-europe",
    lon: 5,
    regions: [
      "europe",
      "africa",
      "middle-east",
      "north-america",
      "south-america",
      "central-asia",
      "india",
      "china",
      "japan",
      "korea",
      "southeast-asia",
      "oceania",
    ],
  },
  {
    id: "north-america",
    lon: -100,
    regions: [
      "north-america",
      "south-america",
      "europe",
      "africa",
      "japan",
      "china",
      "korea",
      "oceania",
      "southeast-asia",
      "middle-east",
      "india",
      "central-asia",
    ],
  },
  {
    id: "south-america",
    lon: -60,
    regions: [
      "south-america",
      "north-america",
      "europe",
      "africa",
      "oceania",
      "middle-east",
      "japan",
      "china",
      "korea",
      "southeast-asia",
      "india",
      "central-asia",
    ],
  },
  {
    id: "oceania",
    lon: 150,
    regions: [
      "oceania",
      "southeast-asia",
      "japan",
      "china",
      "korea",
      "india",
      "north-america",
      "south-america",
      "europe",
      "middle-east",
      "central-asia",
      "africa",
    ],
  },
];

/** 북아메리카 → 남아메리카 → 서유럽 → … → 오세아니아 (지도 위 배치와 같은 순서) */
export const VIEWPOINTS = [...ALL_VIEWPOINTS].sort((a, b) => a.lon - b.lon);

export const DEFAULT_VIEWPOINT: ViewpointId = "east-asia";

/**
 * 언어별 첫 화면 시점: 그 언어를 쓰는 사람이 많은 곳(영어 북아메리카, 스페인어·포르투갈어 중남미 …).
 * 접속 국가는 모르므로(서버 없음) 언어로 정한다. 정적 페이지가 언어마다 따로라 첫 화면부터 이 시점으로 그려진다.
 */
const HOME_VIEWPOINT: Record<Locale, ViewpointId> = {
  ko: "east-asia",
  zh: "east-asia",
  en: "north-america",
  es: "south-america",
  pt: "south-america",
  fr: "western-europe",
  hi: "central-asia",
  ar: "west-asia",
};
export const homeViewpoint = (locale: Locale): ViewpointId =>
  HOME_VIEWPOINT[locale] ?? DEFAULT_VIEWPOINT;

/** 시간대 도시 이름(IANA "대륙/도시"의 도시)으로 고르는 시점. 나머지는 대륙별 기본값(ZONE_DEFAULT) */
const ZONE_CITIES: [ViewpointId, string][] = [
  [
    "west-asia",
    "Dubai Muscat Riyadh Qatar Bahrain Kuwait Baghdad Tehran Jerusalem Tel_Aviv Beirut Damascus Amman Aden Nicosia Famagusta Gaza Hebron Baku Tbilisi Yerevan Cairo Khartoum Juba Addis_Ababa Asmara Djibouti Mogadishu Nairobi Kampala Dar_es_Salaam Mahe",
  ],
  [
    "central-asia",
    "Kolkata Calcutta Karachi Tashkent Samarkand Almaty Qostanay Oral Aqtau Aqtobe Atyrau Qyzylorda Bishkek Dushanbe Ashgabat Kabul Dhaka Kathmandu Katmandu Colombo Thimphu Yekaterinburg Omsk Maldives Chagos Mauritius Reunion Kerguelen",
  ],
  [
    "eastern-europe",
    "Moscow Kiev Kyiv Minsk Istanbul Athens Bucharest Sofia Helsinki Riga Tallinn Vilnius Chisinau Simferopol Volgograd Samara Kirov Saratov Ulyanovsk Astrakhan Kaliningrad Warsaw Johannesburg Harare Maputo Lusaka Lubumbashi Gaborone Windhoek Maseru Mbabane Blantyre Kigali Bujumbura",
  ],
  [
    "south-america",
    "Sao_Paulo Buenos_Aires Argentina Santiago Lima Bogota Caracas La_Paz Asuncion Montevideo Guayaquil Belem Fortaleza Recife Manaus Bahia Cuiaba Campo_Grande Porto_Velho Rio_Branco Boa_Vista Maceio Araguaina Santarem Noronha Cayenne Paramaribo Guyana Punta_Arenas Easter",
  ],
  ["north-america", "Honolulu Johnston Midway"],
];
const ZONE_DEFAULT: Record<string, ViewpointId> = {
  Asia: "east-asia",
  Europe: "western-europe",
  Africa: "western-europe",
  Atlantic: "western-europe",
  America: "north-america",
  US: "north-america",
  Canada: "north-america",
  Brazil: "south-america",
  Chile: "south-america",
  Australia: "oceania",
  Pacific: "oceania",
  Indian: "central-asia",
};

/**
 * 기기 시간대(Intl, 예 "Asia/Singapore")로 고른 첫 화면 시점 - 사는 곳에 가까운 시점. 모르면 null(언어 기준 homeViewpoint).
 * 언어만으로는 영어를 쓰는 싱가포르·인도 사용자가 북아메리카에서 시작했다. 브라우저에서만 부른다(정적 HTML은 언어 기준).
 */
export function zoneViewpoint(timeZone: string): ViewpointId | null {
  const parts = timeZone.split("/");
  for (const [id, cities] of ZONE_CITIES)
    if (parts.slice(1).some((p) => cities.split(" ").includes(p))) return id;
  return ZONE_DEFAULT[parts[0]] ?? null;
}

export const VIEWPOINT_BY_ID = new Map(VIEWPOINTS.map((v) => [v.id, v]));
