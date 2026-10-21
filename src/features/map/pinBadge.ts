/**
 * 묶인 핀 수 표 "+N" 모양 - svg 지도(WorldMap)와 WebGL 글자 판(GlMap)이 같이 쓴다. 단위는 핀 그림 단위(점 반지름 4).
 * 점 오른쪽 위에 붙는 알약 모양: 왼쪽 끝 x, 세로 가운데 y, 높이 h, 글자 font.
 */
export const BADGE = { x: 4, y: -7, h: 12, font: 9 };
/** 화면에서 이 거리(핀 그림 단위) 안의 핀은 하나로 묶는다 - 점(바깥 반지름 6)이 서로 닿을락 말락 */
export const PIN_GROUP = 14;
/** 표 너비: "+" 포함 글자 수 × 숫자 폭 어림 + 양옆 여백 */
export const badgeWidth = (more: number) =>
  (String(more).length + 1) * BADGE.font * 0.62 + BADGE.h * 0.6;
