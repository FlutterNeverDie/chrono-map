import type { RegionId } from "../../src/lib/types";

/**
 * 좌표 → 지역 (대략적인 경계 상자). 자동 초안용이므로 경계 근처는 사람이 검토한다.
 * 순서가 중요하다: 좁은 지역(한국·일본)을 먼저 본다.
 */
export function regionOf(lon: number, lat: number): RegionId {
  const inBox = (w: number, e: number, s: number, n: number) =>
    lon >= w && lon <= e && lat >= s && lat <= n;
  if (inBox(124, 131.9, 33, 43.5)) return "korea";
  if (inBox(129, 146, 30, 46) || inBox(122, 132, 24, 30)) return "japan";
  if (inBox(92, 141, -11, 21.5) || inBox(100, 110, 21.5, 23.5))
    return "southeast-asia";
  if (inBox(60, 97.5, 5, 37)) return "india";
  if (
    inBox(97.5, 135, 18, 42) ||
    inBox(73, 97.5, 37, 42) ||
    inBox(115, 135, 42, 54)
  )
    return "china";
  if (inBox(46, 120, 35, 56)) return "central-asia";
  if (lon >= 110 && lat <= -10) return "oceania";
  if (lon >= 141 || lon <= -150) return "oceania";
  if (lon < -30) return lat > 8 ? "north-america" : "south-america";
  if (inBox(24.5, 34.5, 21, 31.6)) return "africa"; // 이집트
  if (inBox(-10, 26, 35.5, 72)) return "europe"; // 남유럽 섬(몰타·시칠리아 등)까지
  if (inBox(26, 63, 12, 42)) return "middle-east";
  if (lat >= 36 && lon >= -25 && lon <= 60) return "europe";
  if (lat < 37 && lon >= -25 && lon <= 55) return "africa";
  return "europe";
}
