/**
 * 배 그림(장면 kind "ship", units[].vessel) - SVG 경로 글자로 정의해 작은 부대(svg, sceneArt ShipArt)와 대군(canvas Path2D,
 * sceneCrowd)이 같은 모양을 쓴다. 오른쪽을 보고 물 높이가 y=0, 길이 약 56·높이 약 48(부대 그림과 같은 단위).
 * 칠: hull 선체 나무, sail 돛 천, side 진영 색, steel 쇠, dark 그늘 - 먹선 #2b1d14
 */
export type Vessel = "galley" | "sail" | "junk" | "warship";

type Part = {
  d: string;
  fill?: "hull" | "sail" | "side" | "steel" | "dark" | "junk";
  w?: number;
};

export const SHIP_COLORS = {
  hull: "#6b4a30",
  sail: "#e8dcc0",
  steel: "#7d8a96",
  dark: "#3a2a1e",
  junk: "#b0884e",
};

// 노: 뱃전에서 물로 비스듬히(선체 위에 그려 보이게 - 밑에 두면 낮은 선체에 가려 안 보였다)
const oars = Array.from({ length: 8 }, (_, i) => {
  const x = -17 + i * 4.6;
  return `M ${x} -8 L ${x - 6} 0`;
}).join(" ");

export const SHIPS: Record<Vessel, Part[]> = {
  // 갤리선: 길고 낮은 선체, 노 줄, 돛대 하나에 네모 돛(진영 색), 이물에 충각
  galley: [
    {
      d: "M -28 -12 C -20 -3 14 -3 24 -6 L 33 -8 L 24 -11 C 10 -12 -16 -13 -28 -12 Z",
      fill: "hull",
    },
    { d: oars, w: 1.6 },
    { d: "M -28 -12 C -32 -16 -31 -21 -26 -22", w: 2.4 },
    { d: "M -2 -11 L -2 -44", w: 2.4 },
    { d: "M -14 -40 L 10 -40 L 8 -20 L -12 -20 Z", fill: "side" },
  ],
  // 범선(코그·캐럭): 높은 고물 망루, 돛대 둘, 부푼 크림 돛, 돛대 끝 진영 깃발
  sail: [
    {
      d: "M -24 -16 L -21 -2 C -8 1 10 1 18 -2 L 27 -12 L 18 -12 L 16 -9 L -15 -9 L -16 -16 Z",
      fill: "hull",
    },
    { d: "M 0 -9 L 0 -48 M 13 -9 L 13 -36", w: 2.2 },
    {
      d: "M -10 -44 C -6 -36 -6 -24 -10 -16 L 10 -16 C 6 -24 6 -36 10 -44 Z",
      fill: "sail",
    },
    {
      d: "M 6 -33 C 9 -28 9 -22 6 -18 L 19 -18 C 16 -22 16 -28 19 -33 Z",
      fill: "sail",
    },
    { d: "M 0 -48 L 9 -46 L 0 -44 Z", fill: "side", w: 1.5 },
  ],
  // 정크선(몽골·고려 함대): 높은 고물, 대나무 살 돛(황토, 가로 살), 이물 돛 작게
  junk: [
    {
      d: "M -26 -14 L -22 -2 C -10 1 10 1 20 -2 L 27 -9 L -18 -9 L -20 -14 Z",
      fill: "hull",
    },
    { d: "M -2 -9 L -2 -46 M 16 -9 L 16 -32", w: 2.2 },
    { d: "M -13 -44 L 8 -41 L 8 -14 L -13 -12 Z", fill: "junk" },
    {
      d: "M -13 -37 L 8 -35 M -13 -30 L 8 -29 M -13 -23 L 8 -22 M -13 -17 L 8 -16",
      w: 1.2,
    },
    { d: "M 11 -30 L 23 -28 L 23 -14 L 11 -13 Z", fill: "junk" },
    { d: "M 11 -24 L 23 -23 M 11 -19 L 23 -18", w: 1.2 },
    { d: "M -26 -14 L -26 -24 L -21 -22 L -21 -14", fill: "side", w: 1.5 },
  ],
  // 근대 군함: 쇠 선체, 함교·굴뚝, 앞뒤 포탑, 고물 깃발(진영 색)
  warship: [
    { d: "M -30 -11 L -27 -1 L 26 -1 L 34 -12 Z", fill: "steel" },
    { d: "M -12 -11 L -12 -19 L 8 -19 L 8 -11 Z", fill: "steel" },
    { d: "M -3 -19 L -3 -26 L 5 -26 L 5 -19 Z", fill: "steel" },
    { d: "M -11 -19 L -10 -30 L -5 -30 L -6 -19 Z", fill: "dark" },
    {
      d: "M 13 -11 L 13 -15 L 21 -15 L 21 -11 Z M 21 -13 L 30 -14",
      fill: "steel",
      w: 2,
    },
    {
      d: "M -24 -11 L -24 -15 L -17 -15 L -17 -11 Z M -24 -13 L -32 -14",
      fill: "steel",
      w: 2,
    },
    {
      d: "M -27 -11 L -27 -24 M -27 -24 L -20 -22 L -27 -20 Z",
      fill: "side",
      w: 1.5,
    },
  ],
};

export const vesselOf = (v: string | undefined): Vessel =>
  v === "galley" || v === "junk" || v === "warship" ? v : "sail";
