/**
 * 비행기 그림(장면 kind "plane", units[].aircraft) - 배(sceneShip)처럼 SVG 경로 글자로 정의해 작은 부대(svg PlaneArt)와
 * 편대(canvas Path2D, sceneCrowd)가 같은 모양을 쓴다. 오른쪽을 보는 옆모습, 원점 = 동체 가운데(띄우는 높이는 그리는 쪽이).
 * 칠: body 동체, wing 날개(조금 진하게), glass 조종석 유리, dark 엔진·바퀴, side 진영 색 띠(표식·문장은 그리지 않는다)
 */
export type Aircraft = "fighter" | "bomber";

type Part = {
  d: string;
  fill?: "body" | "wing" | "glass" | "dark" | "side";
  w?: number;
};

export const PLANE_COLORS: Record<Aircraft, { body: string; wing: string }> = {
  bomber: { body: "#8f9488", wing: "#767b70" },
  fighter: { body: "#727c66", wing: "#5f6855" },
};
export const PLANE_FIXED = { glass: "#9fb1bb", dark: "#3a2a1e" };

export const PLANES: Record<Aircraft, Part[]> = {
  // 폭격기: 긴 동체, 높은 꼬리, 날개 아래 엔진 둘(옆에서 보이는 것), 이물 유리
  bomber: [
    { d: "M -30 -3 L -37 -17 L -29 -17 L -22 -4 Z", fill: "body" },
    {
      d: "M -35 -2 C -26 -6 18 -6 30 -3 C 35 -2 35 2 30 3 C 18 6 -26 5 -35 2 Z",
      fill: "body",
    },
    { d: "M -14 -5 L -9 -5 L -9 5 L -14 5 Z", fill: "side", w: 1.4 },
    { d: "M -8 1 L 14 1 L 17 4.5 L -6 4.5 Z", fill: "wing" },
    {
      d: "M -1 3 m -3.5 0 a 3.5 2.6 0 1 0 7 0 a 3.5 2.6 0 1 0 -7 0 M 9 3 m -3.5 0 a 3.5 2.6 0 1 0 7 0 a 3.5 2.6 0 1 0 -7 0",
      fill: "dark",
      w: 1.4,
    },
    { d: "M 20 -4.5 C 24 -7 28 -6 30 -3 L 20 -3 Z", fill: "glass", w: 1.4 },
    { d: "M 35 -7 L 35 7", w: 1.2 },
  ],
  // 전투기: 짧은 동체, 물방울 조종석, 앞 프로펠러
  fighter: [
    { d: "M -20 -2 L -24 -11 L -17 -10 L -13 -2 Z", fill: "body" },
    {
      d: "M -23 -1 C -16 -4 12 -5 20 -2 C 23 -1 23 1 20 2 C 12 4 -16 3 -23 1 Z",
      fill: "body",
    },
    { d: "M -10 -3.5 L -7 -3.5 L -7 3.5 L -10 3.5 Z", fill: "side", w: 1.2 },
    { d: "M -5 1 L 10 1 L 9 3.5 L -7 3.5 Z", fill: "wing" },
    { d: "M 1 -3.5 C 4 -8 10 -7 11 -3.5 Z", fill: "glass", w: 1.3 },
    { d: "M 23.5 -6 L 23.5 6", w: 1.2 },
  ],
};

export const aircraftOf = (v: string | undefined): Aircraft =>
  v === "fighter" ? "fighter" : "bomber";
