import type { RegionId, ViewpointId } from "@/lib/types";

export type Viewpoint = {
  id: ViewpointId;
  /** 화면 가운데로 올 경도 */
  lon: number;
  /** 이 시점에서 가까운(관련 깊은) 지역 순서. 시점별 순서 데이터가 없을 때 정렬에 쓴다 */
  regions: RegionId[];
};

/** 지도 시점 9개. 이름은 i18n 사전 viewpoints */
export const VIEWPOINTS: Viewpoint[] = [
  {
    id: "korea",
    lon: 127,
    regions: [
      "korea",
      "china",
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

export const DEFAULT_VIEWPOINT: ViewpointId = "korea";

export const VIEWPOINT_BY_ID = new Map(VIEWPOINTS.map((v) => [v.id, v]));
