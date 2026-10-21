const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

/**
 * 기울인 지도(책상 위 지도를 눈높이에서 보듯): 지도 칸 아래 가운데를 축으로 뒤로 눕히고 원근(perspective)을 건다.
 * 눈 거리 P = 지도 칸 높이의 2배. 먼 쪽(위)이 좁아져 양옆이 비지 않게, 위 끝 폭이 화면 폭이 되도록 k배 키운다(가까운 쪽은 화면 밖으로).
 */
export function tiltParams(tilt: number, h: number) {
  const P = 2 * h;
  const sin = Math.sin((tilt * Math.PI) / 180);
  return { P, k: P / (P - h * sin) };
}
export function tiltTransform(tilt: number, h: number) {
  if (!tilt || !h) return "";
  const { P, k } = tiltParams(tilt, h);
  return `perspective(${round1(P)}px) rotateX(${round2(tilt)}deg) scale(${round4(k)})`;
}
/** 화면 점(client px)을 눕히기 전 지도 칸 위의 점으로(눈에서 그 점으로 가는 선이 누운 판과 만나는 곳) */
export function untilt(
  rect: DOMRect,
  tilt: number,
  cx: number,
  cy: number,
): [number, number] {
  const { P, k } = tiltParams(tilt, rect.height);
  const th = (tilt * Math.PI) / 180;
  // 지평선(먼 쪽 끝)보다 위는 지평선 바로 아래로
  const a = Math.max(
    cy - rect.bottom,
    (-0.97 * P * Math.cos(th)) / Math.sin(th),
  );
  const w = (a * P) / (k * (P * Math.cos(th) + a * Math.sin(th)));
  const u =
    ((cx - rect.left - rect.width / 2) * (P - k * w * Math.sin(th))) / (k * P);
  return [rect.left + rect.width / 2 + u, rect.bottom + w];
}
