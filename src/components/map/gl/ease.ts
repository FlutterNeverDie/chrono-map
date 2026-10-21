// WebGL 지도 애니메이션 곡선(작은 파일 - 본 지도 첫 묶음이 WebGL 코드 전체를 끌어오지 않게 따로)
/** CSS cubic-bezier(x1, y1, x2, y2)의 t(시간 비율) → 진행 비율 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
) {
  const bx = (u: number) =>
    3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
  const by = (u: number) =>
    3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < t) lo = mid;
    else hi = mid;
  }
  return by((lo + hi) / 2);
}
