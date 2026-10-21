import { geoMercator } from "d3-geo";

/**
 * 평면 지도 투영(React·데이터 없음 - 작업 스레드에서도 쓴다): 메르카토르, 위도 82°N ~ 58°S, 가로 1000 단위 = 경도 360°.
 * 본 지도(features/map baseMap)도 같은 값이다.
 */
export const MAP_WIDTH = 1000;
const SCALE = MAP_WIDTH / (2 * Math.PI);
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export const MAP_HEIGHT = Math.round(SCALE * (mercY(82) - mercY(-58)));
export const yOfLat = (lat: number) => SCALE * (mercY(82) - mercY(lat));
export const normalizeLon = (lon: number) =>
  ((((lon + 180) % 360) + 360) % 360) - 180;
export const makeProjection = (lon: number) =>
  geoMercator()
    .rotate([-lon, 0])
    .scale(SCALE)
    .translate([MAP_WIDTH / 2, SCALE * mercY(82)])
    .clipExtent([
      [0, 0],
      [MAP_WIDTH, MAP_HEIGHT],
    ]);
