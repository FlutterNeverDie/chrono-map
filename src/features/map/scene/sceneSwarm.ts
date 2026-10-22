import { clamp01, rng, unitAt, type LonLat, type UnitState } from "./sceneData";

/**
 * 대군 무리(수천 기): 부대 하나를 작은 실루엣 수천 개로. 시뮬레이션처럼 보이지만 t만으로 정해진다(앞 프레임과 무관 -
 * 프레임을 순서 없이 찍어도 같은 그림).
 * - 대형(shape): host(기본 - 앞줄은 거의 반듯, 옆·뒤 가장자리는 굴곡·뭉침·낙오병), mass(둥근 덩어리), ring(둘레를 에워싼 고리,
 *   각자 가운데를 바라봄). 자리는 씨앗 고정 무작위를 최소 간격을 두고 뿌린다 - 고른 무작위면 줄무늬·격자처럼 보였다(RMW 피드백)
 * - 뒷줄은 경로를 조금 늦게 따라온다(lag) - 방향을 틀 때 무리가 줄지어 휘어 흐른다. 대형 방향은 무리 전체가 같고, 경로가
 *   꺾이는 곳에서는 짧게 돌아선다(되돌아가는 경로에서 대형이 한 프레임에 뒤집히던 것)
 * - 돌격(charge): 앞줄이 앞으로 늘어나며 쏠린다(사람마다 빠르기가 달라 줄지어 뻗지 않게), 패주(flee): 적 반대쪽으로 짧게 흩어진다
 * - 줄어들기(count 시간표): 정한 차례(씨앗)대로 쓰러져 자리에 남아 흐려진다
 */
export type SwarmShape = "host" | "mass" | "ring";
export type Swarm = {
  n: number;
  radius: number;
  shape?: SwarmShape;
  /** ring: 안쪽 반지름 비율(기본 0.6) */
  inner?: number;
};
export type Soldier = {
  at: LonLat;
  /** 바라보는 방향(경위도 차이, 땅 위 거리 기준 단위 벡터에 가깝게) */
  dir: LonLat;
  state: UnitState;
  /** 0 = 서 있음, 0~1 = 쓰러진 뒤 흐려지는 정도(1이면 안 그림) */
  fallen: number;
  /** 걸음 위상(초 단위 시간에 더함) */
  phase: number;
  /** 무리 몸통 안에서의 자리 0(가운데)~1(가장자리) 이상 - 적 무리에서 밀려날 때 쓰는 사람마다 다른 여유 */
  slack: number;
};

type Path = { t: number; at: LonLat; state?: UnitState }[];
type Count = number | { t: number; n: number }[] | undefined;
type Person = {
  /** 대형 안 자리(무리 반지름 R 단위): x = 오른쪽, y = 앞(+)·뒤(-) - ring은 가운데 기준 */
  x: number;
  y: number;
  /** 뒷줄 늦음(0~1) */
  depth: number;
  /** 사람마다 늦음·옆 퍼짐 배율(행군 때 뒤쪽이 들쭉날쭉하게) */
  lag: number;
  flare: number;
  /** 행군 때 앞줄 물결(가로로 이어진 부드러운 값 -0.5~0.5) */
  fwave: number;
  wob: [number, number, number];
  /** 패주 흩어짐: 무작위 방향(단위 벡터)·거리(0.3~1) */
  flee: [number, number, number];
  /** 돌격 빠르기(사람마다) */
  dash: number;
  order: number;
  phase: number;
  slack: number;
};

/** 씨앗 고정 2D 값 잡음(0~1, 부드럽게) */
function valueNoise(seed: string) {
  const r = rng(seed);
  const N = 64;
  const grid = Array.from({ length: N * N }, () => r());
  const at = (i: number, j: number) =>
    grid[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
  const s = (k: number) => k * k * (3 - 2 * k);
  return (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const u = s(x - i);
    const v = s(y - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

/** 둘레 굴곡: 각도 → 반지름 배율(2~6번 물결을 씨앗으로 섞음) */
function outline(seed: string, amount: number) {
  const r = rng(seed);
  const waves = [2, 3, 4, 5, 6].map((k) => ({
    k,
    a: (amount * (0.6 + 0.8 * r())) / Math.pow(k, 0.75),
    p: r() * Math.PI * 2,
  }));
  return (ang: number) =>
    1 + waves.reduce((s, w) => s + w.a * Math.cos(w.k * ang + w.p), 0);
}

/**
 * 모양 안에 n개를 최소 간격을 두고 뿌린다(다트 던지기 + 칸 나누기). weight(x, y)는 그 자리에 놓일 확률(0~1) - 가장자리는
 * 서서히 줄어 낙오병이 드문드문 남는다. 간격을 못 지키면 조금씩 줄여 가며 반드시 n개를 채운다
 */
function scatter(
  r: () => number,
  n: number,
  box: [number, number, number, number],
  area: number,
  weight: (x: number, y: number) => number,
): [number, number][] {
  const [x0, y0, x1, y1] = box;
  let min = 0.8 * Math.sqrt(area / n);
  const cell = min;
  const grid = new Map<number, [number, number][]>();
  const key = (i: number, j: number) => i * 100003 + j;
  const out: [number, number][] = [];
  let misses = 0;
  while (out.length < n) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    if (r() > weight(x, y)) continue;
    const i = Math.floor(x / cell);
    const j = Math.floor(y / cell);
    let ok = true;
    const reach = Math.ceil(min / cell);
    for (let a = -reach; a <= reach && ok; a++)
      for (let b = -reach; b <= reach && ok; b++)
        for (const q of grid.get(key(i + a, j + b)) ?? [])
          if (Math.hypot(q[0] - x, q[1] - y) < min) {
            ok = false;
            break;
          }
    if (!ok) {
      if (++misses > 400) {
        min *= 0.93;
        misses = 0;
      }
      continue;
    }
    misses = 0;
    out.push([x, y]);
    const k = key(i, j);
    const list = grid.get(k);
    if (list) list.push([x, y]);
    else grid.set(k, [[x, y]]);
  }
  return out;
}

const smoothstep = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/** 사람마다 고정 값(대형 자리·흔들림·쓰러지는 차례) - id·수·모양이 같으면 한 번만 만든다 */
const cache = new Map<string, Person[]>();
function people(id: string, swarm: Swarm, n: number): Person[] {
  const shape = swarm.shape ?? "host";
  const inner = swarm.inner ?? 0.6;
  const key = `${id}:${n}:${shape}:${inner}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(`${id}:swarm`);
  const edge = outline(`${id}:edge`, shape === "ring" ? 0.12 : 0.16);
  const clump = valueNoise(`${id}:clump`);
  const cz = 2.6; // 뭉침 크기(무리 하나에 2~3개 덩어리)
  const dense = (x: number, y: number) =>
    0.45 + 0.55 * clump(x * cz + 7, y * cz + 3);
  let spots: [number, number][];
  if (shape === "host") {
    // 앞줄: y = 0 근처 거의 반듯(양 끝은 살짝 뒤로 휨). 깊이는 가운데가 깊고 날개로 갈수록 얕다(가로 2·가운데 깊이 약 0.9),
    // 옆·뒤 둘레는 굴곡지고 서서히 드물어져 뒤로 낙오병이 늘어진다. 사각형·평행사변형 덩어리로 보이던 것(RMW 피드백)
    // 앞줄: 거의 반듯하되 양 끝이 뒤로 휘고 무리마다 조금 물결(여러 무리가 나란히 서면 앞줄이 한 줄 자처럼 이어져 상자처럼 보였다)
    const wave = valueNoise(`${id}:front`);
    const front = (x: number) => -0.15 * x * x + (wave(x * 1.8 + 5, 0.5) - 0.5) * 0.08;
    const side = outline(`${id}:side`, 0.22);
    const back = outline(`${id}:back`, 0.3);
    spots = scatter(r, n, [-1.6, -2.0, 1.6, 0.05], 1.5, (x, y) => {
      if (y > front(x) + 0.012) return 0;
      // 그 가로 자리에서 대형 깊이(날개는 얕게) - 뒤 둘레 굴곡. 옆 가장자리는 깊이마다 굴곡이 달라(한쪽에 한 값이면 옆선이 곧게 뻗었다)
      const wing = Math.abs(x) / side((x > 0 ? 0.3 : 3.4) + y * 2.6);
      const deep = 0.9 * (1 - 0.6 * wing * wing) * back(x * 1.7);
      if (wing > 1.55 || deep <= 0.05) return 0;
      const d = (front(x) - y) / deep; // 0 앞줄 ~ 1 뒤 둘레
      // 옆 가장자리(wing 0.72~1.5)와 뒤 둘레(0.8~2) 바깥으로 서서히 드물게 - 낙오병이 옆·뒤로 흩어진다
      const w =
        (1 - smoothstep(0.72, 1.5, wing)) * (1 - smoothstep(0.8, 2.0, d));
      return w * dense(x, y);
    });
  } else if (shape === "mass") {
    spots = scatter(r, n, [-1.3, -1.3, 1.3, 1.3], Math.PI, (x, y) => {
      const q = Math.hypot(x, y) / edge(Math.atan2(y, x));
      return (1 - smoothstep(0.8, 1.25, q)) * dense(x, y);
    });
  } else {
    // 고리: 안·밖 둘레 모두 굴곡, 군데군데 얇은 곳(포위가 빈틈없는 도넛처럼 보이지 않게)
    const gaps = outline(`${id}:gaps`, 0.5);
    spots = scatter(
      r,
      n,
      [-1.25, -1.25, 1.25, 1.25],
      Math.PI * (1 - inner * inner),
      (x, y) => {
        const a = Math.atan2(y, x);
        const d = Math.hypot(x, y) / edge(a);
        const w =
          (1 - smoothstep(0.9, 1.18, d)) *
          smoothstep(inner * 0.82, inner * 1.05, d);
        return w * clamp01(0.35 + 0.65 * (gaps(a) - 0.5)) * dense(x, y);
      },
    );
  }
  // 쓰러지는 차례: 앞줄(적과 맞닿은 쪽)일수록 먼저 - 무작위를 조금 섞어서
  const score = spots.map(([x, y]) =>
    shape === "host" ? -y + r() * 0.6 : -Math.hypot(x, y) + r() * 0.6,
  );
  const order = spots.map((_, i) => i).sort((a, b) => score[a] - score[b]);
  const rank = new Array<number>(n);
  order.forEach((who, k) => (rank[who] = k));
  const march = valueNoise(`${id}:march`);
  const list = spots.map(([x, y], i): Person => {
    const a = r() * Math.PI * 2;
    return {
      x,
      y,
      depth: shape === "host" ? clamp01(-y / 0.9) : 0,
      wob: [r() * 6.28, r() * 6.28, 0.6 + r() * 0.8],
      flee: [Math.cos(a), Math.sin(a), 0.3 + r() * 0.7],
      dash: 0.55 + r() * 0.9,
      order: rank[i],
      phase: r() * 10,
      slack: r(),
      lag: 0.55 + r() * 0.9,
      flare: r() * 2 - 1,
      fwave: march(x * 2.2 + 3, 0.7) - 0.5,
    };
  });
  cache.set(key, list);
  return list;
}

/** count 시간표에서 k번째(0부터) 사람이 쓰러지는 시각(줄어드는 구간을 고르게 나눔), 안 쓰러지면 Infinity */
function fallTime(count: Count, k: number, total: number): number {
  if (!Array.isArray(count)) return Infinity;
  // 쓰러지는 차례 k는 남은 수가 total-1-k 아래로 내려가는 때
  const level = total - 1 - k;
  for (let i = 0; i < count.length - 1; i++) {
    const a = count[i];
    const b = count[i + 1];
    if (b.n < a.n && level >= b.n && level < a.n)
      return a.t + ((a.n - level) / (a.n - b.n)) * (b.t - a.t);
  }
  return count.length && count[0].n <= level ? -Infinity : Infinity;
}

const cosLat = (lat: number) => Math.max(0.2, Math.cos((lat * Math.PI) / 180));
/** 경위도 방향 → 땅 위 각도(동쪽 0, 북쪽 +90°) */
const angleOf = (d: LonLat, lat: number) =>
  Math.atan2(d[1], d[0] * cosLat(lat));

/** 경로가 꺾일 때 대형이 돌아서는 시간(t) */
const TURN = 0.035;

/**
 * 그 시각 대형이 바라보는 땅 위 각도. 경로 키를 지나 방향이 바뀌면 TURN 동안 짧은 쪽으로 돈다(180°면 늘 같은 쪽).
 * 멈춘 구간(같은 자리 두 키)은 앞 구간 방향 그대로
 */
export function headingAt(path: Path, t: number): number {
  const dirAt = (tt: number) => {
    const u = unitAt(path, tt);
    return Math.hypot(u.dir[0], u.dir[1]) > 1e-9
      ? angleOf(u.dir, u.at[1])
      : null;
  };
  // 지금 구간과 그 시작 키
  let i = 0;
  while (i < path.length - 2 && path[i + 1].t <= t) i++;
  let now = dirAt(t);
  // 멈춘 구간이면 그 전 움직인 방향
  for (let j = i; now === null && j > 0; j--) now = dirAt(path[j].t - 1e-4);
  if (now === null) now = 0;
  const key = path[i]?.t ?? 0;
  if (i === 0 || t < key || t - key >= TURN) return now;
  let before: number | null = null;
  for (let j = i; before === null && j > 0; j--)
    before = dirAt(path[j].t - 1e-4);
  if (before === null) return now;
  let diff = now - before;
  diff = ((diff % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  if (Math.abs(Math.abs(diff) - Math.PI) < 1e-3) diff = Math.PI;
  return before + diff * smoothstep(0, 1, (t - key) / TURN);
}

/** 무리 몸통(타원): 경위도 기준점에서 앞(+)·뒤 거리 cy, 반지름 가로 rx·세로 ry(모두 도, 땅 위 거리), 각도 ang */
export type Body = {
  at: LonLat;
  ang: number;
  cy: number;
  rx: number;
  ry: number;
};
/** 무리 몸통(밀어내기·피하기 계산용) - 대형 모양과 맞춘다 */
export function bodyOf(path: Path, swarm: Swarm, t: number): Body {
  const u = unitAt(path, t);
  const R = swarm.radius;
  const ang = headingAt(path, t);
  const shape = swarm.shape ?? "host";
  if (shape === "host") {
    const c = levelOf(path, t, "charge");
    return { at: u.at, ang, cy: -0.45 * R * (1 + 0.2 * c), rx: R, ry: 0.5 * R * (1 + 0.25 * c) };
  }
  return { at: u.at, ang, cy: 0, rx: R, ry: R };
}

/** 몸통 가운데(경위도) */
export function bodyCenter(b: Body): LonLat {
  const c = cosLat(b.at[1]);
  return [
    b.at[0] + (Math.cos(b.ang) * b.cy) / c,
    b.at[1] + Math.sin(b.ang) * b.cy,
  ];
}
/** 몸통 타원이 땅 위 방향 (dx, dy)(단위 벡터)로 뻗은 거리 */
export function bodyReach(b: Body, dx: number, dy: number): number {
  const f = dx * Math.cos(b.ang) + dy * Math.sin(b.ang);
  const s = -dx * Math.sin(b.ang) + dy * Math.cos(b.ang);
  return Math.hypot(b.ry * f, b.rx * s);
}
/** 점(땅 위 거리, 몸통 가운데 기준 dx, dy)이 몸통 안 어디쯤인지(1 = 둘레) */
export function bodyDepth(b: Body, dx: number, dy: number): number {
  const f = dx * Math.cos(b.ang) + dy * Math.sin(b.ang);
  const s = -dx * Math.sin(b.ang) + dy * Math.cos(b.ang);
  return Math.hypot(f / b.ry, s / b.rx);
}

export function swarmAt(
  id: string,
  path: Path,
  swarm: Swarm,
  count: Count,
  t: number,
  /** 패주할 때 달아날 쪽(땅 위 단위 벡터, 가장 가까운 적의 반대쪽) - 없으면 대형 뒤쪽 */
  away?: [number, number],
): Soldier[] {
  const n = Math.max(1, Math.round(swarm.n));
  const shape = swarm.shape ?? "host";
  const ps = people(id, swarm, n);
  const R = swarm.radius;
  const ang = headingAt(path, t);
  const fx = Math.cos(ang);
  const fy = Math.sin(ang);
  const now = unitAt(path, t);
  const flee = now.state === "flee";
  const since = flee ? fleeSince(path, t) : 0;
  const run = away ?? [-fx, -fy];
  const out: Soldier[] = [];
  for (let i = 0; i < n; i++) {
    const p = ps[i];
    // 뒷줄일수록 늦게(경로를 따라 흐르게) - 방향은 무리 전체가 같다
    // 뒷줄일수록 늦게 - 사람마다 늦음이 달라 뒤쪽 끝이 들쭉날쭉(모두 같으면 경로와 나란한 반듯한 옆선·뒷선이 생겨 행군 대형이 네모 상자처럼 보였다)
    const ti = t - p.depth * 0.035 * p.lag;
    const u = p.depth ? unitAt(path, ti) : now;
    const cos = cosLat(u.at[1]);
    const fast = levelOf(path, ti, "charge");
    let ox: number;
    let oy: number;
    let face: [number, number] = [fx, fy];
    if (shape === "ring") {
      ox = p.x * R;
      oy = p.y * R;
      const d = Math.hypot(ox, oy) || 1;
      face = [-ox / d, -oy / d];
    } else {
      // 대형 안 자리(앞 = +): 돌격이면 깊이가 늘어나고 앞줄이 사람마다 다른 빠르기로 튀어나간다
      // 뒤로 갈수록 옆으로 조금 넓고 사람마다 흐트러지게
      const wide = (p.x * (1 + 0.18 * p.depth) + p.flare * 0.1 * p.depth) * R;
      let deep = p.y * R * (1 + fast * 0.25);
      // 행군 중에는 앞줄도 물결지게(나란히 선 무리의 앞줄이 한 줄 자처럼 이어져 상자처럼 보였다) - 맞붙는 돌격·버팀에서는 반듯하게
      deep += levelOf(path, ti, "march") * p.fwave * R * 0.35 * (1 - p.depth * 0.6);
      deep += fast * R * 0.18 * (1 - p.depth) * p.dash;
      ox = fx * deep + fy * wide; // 오른쪽 = (fy, -fx)
      oy = fy * deep - fx * wide;
    }
    // 흔들림(사람마다 다른 느린 물결)
    const w = p.wob;
    ox += Math.sin(ti * 40 * w[2] + w[0]) * R * 0.02;
    oy += Math.sin(ti * 33 * w[2] + w[1]) * R * 0.02;
    if (flee) {
      // 패주: 달아날 쪽 60% + 사람마다 무작위 40%, 짧게(무리 반지름의 1배 안) - 시간에 따라 서서히
      const k = clamp01(since * 6) * p.flee[2] * R;
      const dx = run[0] * 0.6 + p.flee[0] * 0.55;
      const dy = run[1] * 0.6 + p.flee[1] * 0.55;
      ox += dx * k;
      oy += dy * k;
      const l = Math.hypot(dx, dy) || 1;
      face = [dx / l, dy / l];
    }
    const tf = fallTime(count, p.order, n);
    out.push({
      at: [u.at[0] + ox / cos, u.at[1] + oy],
      dir: [face[0] / cos, face[1]],
      state: u.state,
      fallen: t < tf ? 0 : clamp01((t - tf) / 0.08) * 0.8 + 0.2,
      phase: p.phase,
      slack: p.slack,
    });
  }
  return out;
}

/**
 * 그 시각 state인 정도 0~1: 상태가 바뀌는 키에서 SHIFT 동안 부드럽게 옮겨 간다(돌격 쏠림·맞붙는 거리가 한 프레임에 튀지 않게).
 * 상태 판정은 unitAt과 같다
 */
const SHIFT = 0.03;
export function levelOf(path: Path, t: number, state: UnitState): number {
  const on = (x: number) => (unitAt(path, x).state === state ? 1 : 0);
  let change = -Infinity;
  for (const k of path) {
    if (k.t > t) break;
    if (on(k.t) !== on(k.t - 1e-6)) change = k.t;
  }
  if (t - change >= SHIFT) return on(t);
  const before = on(change - 1e-6);
  return before + (on(t) - before) * smoothstep(0, SHIFT, t - change);
}

/** 패주 상태가 시작된 뒤 지난 시간(t 단위) */
function fleeSince(path: Path, t: number): number {
  let start = Infinity;
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i].t > t) continue;
    if (path[i].state === "flee") start = path[i].t;
    else break;
  }
  return start === Infinity ? 0 : t - start;
}
