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
  /** 0 서 있음, 0~1 쓰러져 흐려지는 중 */
  fallen: number;
  alpha: number;
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

const INK_C = "#2b1d14";
/**
 * 대군 실루엣 하나(canvas): 키 48 단위 그림을 s배로. 화면에서 6px보다 작으면 점(무리가 점으로 묶여 보이게),
 * 크면 말·사람 실루엣과 달리는 다리(두 자세). 쓰러진 것은 누운 모양으로 흐려진다
 */
export function drawFigure(g: CanvasRenderingContext2D, m: Figure) {
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
  if (h < 6) {
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
    g.globalAlpha = 1;
    return;
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
  // 작을수록 먹선을 가늘게(무리가 검게 뭉치지 않게)
  g.strokeStyle = h < 18 ? "rgba(43,29,20,0.6)" : INK_C;
  const thin = h < 18 ? 0.6 : 1;
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
