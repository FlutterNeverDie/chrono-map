/**
 * 대군 그리기(canvas 2D) - 그리는 쪽만 모아 둔 곳. 자리 계산(sceneSwarm.ts)·화면 옮기기(SceneLayer)와 떨어져 있어
 * 지도를 다른 그리기 방식(WebGL 등)으로 바꿀 때 이 파일만 바꾸면 된다. 입력은 화면 CSS px 기준 평범한 값들.
 */

/** 화면에 그릴 실루엣 하나 */
export type Figure = {
  /** 무리(같은 무리끼리 모아 그린다) */
  group: number;
  x: number;
  y: number;
  /** 크기(키 48 단위 그림의 배율) */
  s: number;
  /** 1 오른쪽, -1 왼쪽 */
  face: number;
  kind: string;
  color: string;
  horse: string;
  armor: boolean;
  phase: number;
  fast: boolean;
  /** 0 서 있음, 0~1 쓰러져 흐려지는 중(배는 불타다 가라앉는 중) */
  fallen: number;
  alpha: number;
  /** 배: 종류(sceneShip), 움직이는 중(항적), 흔들림 세기(폭풍 0~1) */
  vessel?: string;
  moving?: boolean;
  rock?: number;
  /** 비행기: 종류(sceneAir), 나는 높이(그림 단위 - 땅 위 자리에서 이만큼 띄우고 땅에는 그림자) */
  aircraft?: string;
  alt?: number;
};

/** 무리 바닥 그림자(화면 타원) - 덩어리가 한눈에 읽히게 */
export type GroupShade = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  alpha: number;
};

/** 무리마다 바닥 그림자를 깔고, 무리는 화면 아래(가까운) 순서로, 무리 안에서는 위에서 아래로 그린다(서로 섞이지 않게) */
export function drawCrowd(
  g: CanvasRenderingContext2D,
  figures: Figure[],
  shades: Map<number, GroupShade>,
) {
  const groups = new Map<number, Figure[]>();
  for (const f of figures) {
    const list = groups.get(f.group) ?? [];
    list.push(f);
    groups.set(f.group, list);
  }
  const order = [...groups.entries()].sort(
    (a, b) => (shades.get(a[0])?.y ?? 0) - (shades.get(b[0])?.y ?? 0),
  );
  for (const [id, list] of order) {
    const sh = shades.get(id);
    if (sh) {
      g.globalAlpha = 0.13 * sh.alpha;
      g.fillStyle = "#2b1d14";
      g.filter = `blur(${Math.max(4, sh.ry * 0.25)}px)`;
      g.beginPath();
      g.ellipse(sh.x, sh.y, sh.rx, sh.ry, 0, 0, Math.PI * 2);
      g.fill();
      g.filter = "none";
      g.globalAlpha = 1;
    }
    list.sort((a, b) => a.y - b.y);
    for (const f of list) drawFigure(g, f);
  }
}

import { SHIP_COLORS, SHIPS, vesselOf } from "./sceneShip";
import { PLANE_COLORS, PLANE_FIXED, PLANES, aircraftOf } from "./sceneAir";

const INK_C = "#2b1d14";
const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
/**
 * 대군 실루엣 하나(canvas): 키 48 단위 그림을 s배로. 화면에서 6px보다 작으면 점(무리가 점으로 묶여 보이게),
 * 크면 말·사람 실루엣과 달리는 다리(두 자세). 쓰러진 것은 누운 모양으로 흐려진다
 */
export function drawFigure(g: CanvasRenderingContext2D, m: Figure) {
  if (m.kind === "ship") return drawShip(g, m);
  if (m.kind === "plane") return drawPlane(g, m);
  const cav = m.kind === "cavalry" || m.kind === "horse-archer";
  const h = 48 * m.s;
  g.globalAlpha = m.alpha * (m.fallen ? 1 - m.fallen : 1);
  if (m.fallen) {
    g.fillStyle = INK_C;
    g.beginPath();
    g.ellipse(m.x, m.y, (cav ? 16 : 8) * m.s, 3 * m.s, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    return;
  }
  // 점 ↔ 실루엣은 키 7~11px에서 서로 엇갈려 옅어지고 짙어진다(멀리서 작은 실루엣의 먹선이 모여 검은 갈색 덩어리가 됐다 - 멀리서는 진영 색 점 무리)(한 크기에서 갑자기 바뀌면 원근으로 그 크기를 지나는 줄이
  // 이음매처럼 보였고, 다가가는 카메라에서는 튀었다)
  const base = g.globalAlpha;
  const dot = 1 - smooth(7, 11, h);
  if (dot > 0) {
    // 점은 진영 색 그대로 조금 옅게(먹선 없이)
    g.globalAlpha = base * dot * 0.85;
    g.fillStyle = m.color;
    g.beginPath();
    g.ellipse(
      m.x,
      m.y - h * 0.4,
      Math.max(0.8, h * 0.35),
      Math.max(0.8, h * 0.4),
      0,
      0,
      Math.PI * 2,
    );
    g.fill();
    g.globalAlpha = base;
    if (dot >= 1) {
      g.globalAlpha = 1;
      return;
    }
    g.globalAlpha = base * (1 - dot);
  }
  g.save();
  g.translate(m.x, m.y);
  g.scale(m.s * m.face, m.s);
  // 그림자
  g.fillStyle = "rgba(43,29,20,0.25)";
  g.beginPath();
  g.ellipse(1, 0.5, cav ? 20 : 9, cav ? 3.5 : 2, 0, 0, Math.PI * 2);
  g.fill();
  const bob = Math.abs(Math.sin(m.phase)) * (m.fast ? 2.5 : 1);
  g.translate(0, -bob);
  g.lineJoin = "round";
  g.lineCap = "round";
  // 작을수록 먹선을 가늘고 옅게(무리가 검게 뭉치지 않게) - 키 12~24px 사이에서 서서히(18px에서 갑자기 바꾸면 원근으로
  // 그 크기를 지나는 곳에 밝고 어두운 경계가 생겨 포위 고리가 위아래 반으로 갈라져 보였다)
  const k = smooth(10, 26, h);
  g.strokeStyle = `rgba(43,29,20,${0.35 + 0.65 * k})`;
  const thin = 0.5 + 0.5 * k;
  const swing = Math.sin(m.phase) * (m.fast ? 0.7 : 0.35);
  const leg = (x: number, y: number, a: number, w: number) => {
    g.lineWidth = w * thin;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.sin(a) * 6, y / 2);
    g.lineTo(x + Math.sin(a) * 10, 0);
    g.stroke();
  };
  if (cav) {
    leg(-9, -19, -swing, 4);
    leg(10, -19, swing, 4);
    g.fillStyle = m.horse;
    g.lineWidth = 3 * thin;
    g.beginPath();
    g.moveTo(-18, -26);
    g.bezierCurveTo(-20, -34, -8, -36, 6, -34);
    g.bezierCurveTo(14, -33, 16, -38, 22, -46);
    g.lineTo(31, -42);
    g.lineTo(24, -36);
    g.bezierCurveTo(21, -26, 16, -18, 8, -18);
    g.lineTo(-12, -18);
    g.bezierCurveTo(-18, -18, -20, -21, -18, -26);
    g.closePath();
    g.fill();
    g.stroke();
    leg(-13, -20, swing, 4);
    leg(13, -20, -swing, 4);
    // 사람
    g.save();
    if (m.fast) g.rotate((10 * Math.PI) / 180);
    // 작은 실루엣은 몸통을 진영 색으로(쇠갑옷 회색이면 지형 위에서 진영이 안 보였다) - 쇠갑옷은 투구로
    g.fillStyle = m.color;
    g.beginPath();
    g.moveTo(-4, -33);
    g.bezierCurveTo(-6, -44, -3, -51, 3, -51);
    g.bezierCurveTo(9, -51, 11, -45, 10, -33);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = m.armor ? "#8c8a80" : "#7a2e22";
    g.beginPath();
    g.arc(3, -56, 5.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (m.kind === "cavalry") {
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-6, -30);
      g.lineTo(28, -60);
      g.stroke();
    }
    g.restore();
  } else {
    leg(-2, -16, -swing, 3.5);
    leg(2, -16, swing, 3.5);
    g.fillStyle = m.color;
    g.lineWidth = 3 * thin;
    g.beginPath();
    g.moveTo(-6, -15);
    g.bezierCurveTo(-8, -28, -5, -36, 1, -36);
    g.bezierCurveTo(7, -36, 9, -28, 7, -15);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#8c8a80";
    g.beginPath();
    g.arc(1, -42, 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(9, -2);
    g.lineTo(9, -58);
    g.stroke();
    g.fillStyle = m.color;
    g.beginPath();
    g.arc(7, -24, 7.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
}

const shipPaths = new Map<string, Path2D>();
const path2d = (d: string) => {
  let p = shipPaths.get(d);
  if (!p) shipPaths.set(d, (p = new Path2D(d)));
  return p;
};

/**
 * 배 하나(canvas, 오른쪽을 보고 물 높이 y=0): 물결에 흔들리고(rock = 폭풍이면 크게), 움직이면 뒤로 흰 항적·이물 물보라.
 * 가라앉는 배(fallen 0~1): 처음에 불이 붙어 연기가 오르고, 이어 고물부터 기울며 물 밑으로(물 높이에서 잘림) 사라진다.
 * 작으면 다른 부대처럼 진영 색 점(가로로 긴 타원)
 */
function drawShip(g: CanvasRenderingContext2D, m: Figure) {
  const h = 48 * m.s;
  const sink = smooth(0.35, 1, m.fallen);
  if (sink >= 1) return;
  const fire =
    m.fallen > 0
      ? smooth(0, 0.12, m.fallen) * (1 - smooth(0.55, 0.85, m.fallen))
      : 0;
  const base = m.alpha * (1 - sink * 0.25);
  const dot = 1 - smooth(7, 11, h);
  if (dot > 0) {
    g.globalAlpha = base * dot * 0.85;
    g.fillStyle = m.color;
    g.beginPath();
    g.ellipse(
      m.x,
      m.y - h * 0.1,
      Math.max(1, h * 0.55),
      Math.max(0.7, h * 0.15),
      0,
      0,
      Math.PI * 2,
    );
    g.fill();
    if (dot >= 1) {
      g.globalAlpha = 1;
      return;
    }
  }
  const a = base * (1 - dot);
  const rock = m.rock ?? 0;
  const k = smooth(10, 26, h);
  const thin = 0.5 + 0.5 * k;
  g.save();
  g.translate(m.x, m.y);
  g.scale(m.s * m.face, m.s);
  g.lineJoin = "round";
  g.lineCap = "round";
  // 물 높이 줄·항적(배와 같이 흔들리지 않는다)
  g.globalAlpha = a * 0.4;
  g.strokeStyle = "#efe6d2";
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-30, 0.5);
  g.lineTo(32, 0.5);
  g.stroke();
  if (m.moving && sink === 0) {
    const wave = Math.sin(m.phase * 0.5);
    g.globalAlpha = a * 0.5;
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(-26, 0);
    g.bezierCurveTo(-42, 1.5, -58, 3 + wave, -78, 4);
    g.moveTo(-26, -0.5);
    g.bezierCurveTo(-40, -1.5, -55, -2, -72, -2.5 - wave * 0.5);
    g.stroke();
    // 이물 물보라
    g.globalAlpha = a * 0.55;
    g.fillStyle = "#efe6d2";
    g.beginPath();
    g.ellipse(30, -1, 5 + wave, 2.2, 0, 0, Math.PI * 2);
    g.fill();
  }
  // 물 위만 보이게(가라앉으면 물 높이에서 잘린다)
  g.beginPath();
  g.rect(-200, -200, 400, 200.5);
  g.clip();
  // 흔들림·가라앉음
  const roll = (Math.sin(m.phase * 0.5) * ((2 + 8 * rock) * Math.PI)) / 180;
  const heave = Math.sin(m.phase * 0.37) * (0.5 + 2.5 * rock);
  g.translate(0, heave + sink * 52);
  g.rotate(roll - sink * 0.45);
  g.globalAlpha = a;
  g.strokeStyle = `rgba(43,29,20,${0.35 + 0.65 * k})`;
  const fills: Record<string, string> = { ...SHIP_COLORS, side: m.color };
  // 불탄 배는 그을린다
  const burnt = smooth(0, 0.5, m.fallen);
  for (const part of SHIPS[vesselOf(m.vessel)]) {
    const p = path2d(part.d);
    if (part.fill) {
      g.fillStyle =
        burnt > 0 && part.fill !== "steel"
          ? mixHex(fills[part.fill], "#2e241c", burnt * 0.7)
          : fills[part.fill];
      g.fill(p);
    }
    g.lineWidth = (part.w ?? 2.4) * thin;
    g.stroke(p);
  }
  // 불길·연기(time 위상으로 일렁임)
  if (fire > 0.01) {
    for (const [fx, fy, j] of [
      [-6, -14, 0],
      [8, -12, 1],
      [-16, -13, 2],
    ]) {
      const fl = 0.75 + 0.25 * Math.sin(m.phase * 2.3 + j * 2.1);
      const fh = 14 * fire * fl;
      const fw = fh * 0.45;
      g.fillStyle = "#d9772b";
      g.beginPath();
      g.moveTo(fx - fw, fy);
      g.quadraticCurveTo(fx - fw, fy - fh * 0.6, fx, fy - fh);
      g.quadraticCurveTo(fx + fw, fy - fh * 0.6, fx + fw, fy);
      g.closePath();
      g.fill();
      g.fillStyle = "#f2c14e";
      g.beginPath();
      g.moveTo(fx - fw * 0.5, fy);
      g.quadraticCurveTo(fx - fw * 0.5, fy - fh * 0.35, fx, fy - fh * 0.55);
      g.quadraticCurveTo(fx + fw * 0.5, fy - fh * 0.35, fx + fw * 0.5, fy);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#3a322b";
    for (let j = 0; j < 4; j++) {
      const kk = (((m.phase * 0.08 + j / 4) % 1) + 1) % 1;
      g.globalAlpha = a * fire * (1 - kk) * 0.45;
      g.beginPath();
      g.ellipse(
        -4 + kk * 14,
        -24 - kk * 40,
        5 + kk * 12,
        4 + kk * 9,
        0,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
  g.restore();
  g.globalAlpha = 1;
}

function mixHex(a: string, b: string, k: number) {
  const p = (h: string, i: number) =>
    parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k)).join(",")})`;
}

/**
 * 비행기 하나(canvas): 땅 위 자리(m.x, m.y)에 그림자, 높이 alt만큼 위에 옆모습(천천히 오르내림, 프로펠러는 옅은 원판).
 * 격추(fallen 0~1): 연기를 끌며 기수를 숙여 땅으로 내려오고 끝에서 사라진다. 작으면 진영 색 점(가로로 긴)
 */
function drawPlane(g: CanvasRenderingContext2D, m: Figure) {
  const h = 48 * m.s;
  const shot = smooth(0.1, 1, m.fallen);
  const gone = smooth(0.85, 1, m.fallen);
  if (gone >= 1) return;
  const lift = (m.alt ?? 110) * m.s * (1 - shot);
  const base = m.alpha * (1 - gone);
  // 그림자(땅 위 자리 - 높이 떠 있을수록 옅고 넓게)
  const spread = 1 + (m.alt ?? 110) / 300;
  g.globalAlpha = base * 0.2 * (1 - shot * 0.5);
  g.fillStyle = INK_C;
  g.beginPath();
  g.ellipse(m.x, m.y, 26 * m.s * spread, 4 * m.s * spread, 0, 0, Math.PI * 2);
  g.fill();
  const y = m.y - lift + Math.sin(m.phase * 0.3) * 1.5 * m.s;
  const dot = 1 - smooth(7, 11, h);
  if (dot > 0) {
    g.globalAlpha = base * dot * 0.85;
    g.fillStyle = m.color;
    g.beginPath();
    g.ellipse(
      m.x,
      y,
      Math.max(1, h * 0.5),
      Math.max(0.6, h * 0.1),
      0,
      0,
      Math.PI * 2,
    );
    g.fill();
    if (dot >= 1) {
      g.globalAlpha = 1;
      return;
    }
  }
  const a = base * (1 - dot);
  const k = smooth(10, 26, h);
  const thin = 0.5 + 0.5 * k;
  g.save();
  g.translate(m.x, y);
  g.scale(m.s * m.face, m.s);
  // 격추 연기 꼬리(뒤로 길게)
  if (m.fallen > 0) {
    g.fillStyle = "#3a322b";
    for (let j = 0; j < 7; j++) {
      const kk = j / 7;
      g.globalAlpha = a * (1 - kk) * 0.4 * smooth(0, 0.1, m.fallen);
      g.beginPath();
      g.ellipse(
        -30 - kk * 70,
        -kk * 20 * shot - kk * 6,
        5 + kk * 10,
        4 + kk * 7,
        0,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
  g.rotate(shot * 0.7);
  g.globalAlpha = a;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = `rgba(43,29,20,${0.35 + 0.65 * k})`;
  const kind = aircraftOf(m.aircraft);
  const fills: Record<string, string> = {
    ...PLANE_COLORS[kind],
    ...PLANE_FIXED,
    side: m.color,
  };
  for (const part of PLANES[kind]) {
    const p = path2d(part.d);
    if (part.fill) {
      g.fillStyle = fills[part.fill];
      g.fill(p);
    }
    g.lineWidth = (part.w ?? 2.2) * thin;
    g.stroke(p);
  }
  // 프로펠러 원판(옅게)
  g.globalAlpha = a * 0.25;
  g.fillStyle = "#efe6d2";
  g.beginPath();
  g.ellipse(kind === "fighter" ? 23.5 : 35, 0, 1.6, 7, 0, 0, Math.PI * 2);
  g.fill();
  // 격추: 엔진 불
  if (m.fallen > 0 && shot < 0.95) {
    g.globalAlpha = a;
    g.fillStyle = "#d9772b";
    g.beginPath();
    g.ellipse(-2, -2, 5, 3.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f2c14e";
    g.beginPath();
    g.ellipse(-1, -2, 2.5, 1.8, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.globalAlpha = 1;
}
