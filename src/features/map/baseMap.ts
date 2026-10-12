import { geoGraticule10, geoMercator } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/land-110m.json";

/** 평면(메르카토르) 지도. 가로 = 경도 360° 전체, 세로 = 위도 82°N ~ 58°S (그린란드 북단 ~ 남미 남단) */
export const MAP_WIDTH = 1000;
const MAX_LAT = 82;
const MIN_LAT = -58;
const SCALE = MAP_WIDTH / (2 * Math.PI);
const mercatorY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export const MAP_HEIGHT = Math.round(
  SCALE * (mercatorY(MAX_LAT) - mercatorY(MIN_LAT)),
);

/** centerLon 경도가 화면 가운데 오도록 회전한 투영 */
export function makeProjection(centerLon: number) {
  return geoMercator()
    .rotate([-centerLon, 0])
    .scale(SCALE)
    .translate([MAP_WIDTH / 2, SCALE * mercatorY(MAX_LAT)])
    .clipExtent([
      [0, 0],
      [MAP_WIDTH, MAP_HEIGHT],
    ]);
}

/** 경도를 -180 ~ 180으로 */
export function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

export const graticule = geoGraticule10();

/** 육지(현대 해안선, 110m — 처음 화면용). 나라 영역은 이 모양으로 잘라 바다로 번지지 않게 한다 */
const topology = world as unknown as Topology<{ land: GeometryCollection }>;
export const land = feature(topology, topology.objects.land);

/** 확대했을 때 쓰는 자세한 해안선(50m, 약 550KB). public/geo에 두고 필요할 때 한 번만 받는다 */
let detailed: Promise<typeof land> | null = null;
export function loadDetailedLand(): Promise<typeof land> {
  detailed ??= fetch("/geo/land-50m.json")
    .then((r) => r.json())
    .then((t: Topology<{ land: GeometryCollection }>) =>
      feature(t, t.objects.land),
    );
  return detailed;
}
