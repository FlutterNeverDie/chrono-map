import { clamp01, rng, unitAt, type LonLat, type UnitState } from "./sceneData";

/**
 * 대군 무리(수천 기): 부대 하나를 작은 실루엣 수천 개로. 시뮬레이션처럼 보이지만 t만으로 정해진다(앞 프레임과 무관 -
 * 프레임을 순서 없이 찍어도 같은 그림).
 * - 대형: 앞이 반듯한 반원 무리(가로가 넓고 옆·뒤 가장자리는 들쭉날쭉), 자리는 씨앗 고정 무작위
 * - 뒷줄은 경로를 조금 늦게 따라온다(lag) - 방향을 틀 때 무리가 줄지어 휘어 흐른다
 * - 돌격(charge): 앞줄이 앞으로 늘어나며 쏠린다, 패주(flee): 각자 다른 방향으로 흩어진다
 * - 줄어들기(count 시간표): 정한 차례(씨앗)대로 쓰러져 자리에 남아 흐려진다
 */
export type Swarm = { n: number; radius: number };
export type Soldier = {
  at: LonLat;
  /** 움직이는 방향(경위도 차이) */
  dir: LonLat;
  state: UnitState;
  /** 0 = 서 있음, 0~1 = 쓰러진 뒤 흐려지는 정도(1이면 안 그림) */
  fallen: number;
  /** 걸음 위상(초 단위 시간에 더함) */
  phase: number;
};

type Path = { t: number; at: LonLat; state?: UnitState }[];
type Count = number | { t: number; n: number }[] | undefined;

/** 사람마다 고정 값(대형 자리·흔들림·쓰러지는 차례) - id·수가 같으면 한 번만 만든다 */
const cache = new Map<
  string,
  {
    col: number;
    row: number;
    jx: number;
    jy: number;
    wob: number[];
    flee: [number, number];
    order: number;
    phase: number;
  }[]
>();
function people(id: string, n: number) {
  const key = `${id}:${n}`;
  let p = cache.get(key);
  if (p) return p;
  const r = rng(`${id}:swarm`);
  const order = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5);
  const rank = new Array<number>(n);
  order.forEach((who, k) => (rank[who] = k));
  p = Array.from({ length: n }, (_, i) => {
    // 대형: 앞이 반듯한 반원(앞 = row 0). 그 안에 무작위로 흩뿌리고 가장자리는 들쭉날쭉하게 - 격자면 반듯한 블록처럼 보였다
    let col = 0;
    let row = 0;
    for (let tries = 0; tries < 30; tries++) {
      col = r() * 2 - 1;
      row = r();
      const edge = 1 + (r() - 0.5) * 0.25;
      if (col * col + row * row * 1.1 <= edge) break;
    }
    // 앞줄은 반듯하게(앞쪽으로 갈수록 흔들림 적게)
    row = Math.max(0, row - 0.04 * (1 - row));
    const a = r() * Math.PI * 2;
    return {
      col: col / 2,
      row,
      jx: 0,
      jy: 0,
      wob: [r() * 6.28, r() * 6.28, 0.6 + r() * 0.8],
      // 패주: 무작위 방향, 짧은 거리(줄지어 뻗는 가시 모양이 인공적이었다)
      flee: [Math.cos(a) * (0.3 + r() * 0.7), Math.sin(a) * (0.3 + r() * 0.7)],
      order: rank[i],
      phase: r() * 10,
    };
  });
  cache.set(key, p);
  return p;
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

export function swarmAt(
  id: string,
  path: Path,
  swarm: Swarm,
  count: Count,
  t: number,
): Soldier[] {
  const n = Math.max(1, Math.round(swarm.n));
  const ps = people(id, n);
  const out: Soldier[] = [];
  for (let i = 0; i < n; i++) {
    const p = ps[i];
    // 뒷줄일수록 늦게(경로를 따라 흐르게)
    const lag = p.row * 0.035;
    const ti = t - lag;
    const u = unitAt(path, ti);
    const len = Math.hypot(u.dir[0], u.dir[1]) || 1;
    const lat = u.at[1];
    const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    // 앞(f)·오른쪽(r) - 경도는 cos(위도)로 나눠 땅 위 거리로
    const fx = u.dir[0] / len;
    const fy = u.dir[1] / len;
    const R = swarm.radius;
    const fast = u.state === "charge" ? 1 : 0;
    const flee = u.state === "flee" ? 1 : 0;
    // 대형: 가로 넓게, 세로(깊이) 좁게, 돌격이면 깊이가 늘어나 앞줄이 튀어나간다
    const wide = p.col * 2 * R + p.jx * R * 0.12;
    const deep =
      -(p.row * R * 0.7 * (1 + fast * 0.8)) +
      p.jy * R * 0.1 +
      fast * R * 0.25 * (1 - p.row);
    // 흔들림(사람마다 다른 느린 물결)
    const w = p.wob;
    const wx = Math.sin(ti * 40 * w[2] + w[0]) * R * 0.02;
    const wy = Math.sin(ti * 33 * w[2] + w[1]) * R * 0.02;
    // 패주: 각자 방향으로 흩어진다(패주가 시작된 뒤 시간만큼)
    let sx = 0;
    let sy = 0;
    if (flee) {
      const since = fleeSince(path, ti);
      sx = p.flee[0] * R * 1.1 * clamp01(since * 6);
      sy = p.flee[1] * R * 0.8 * clamp01(since * 6);
    }
    const dx = fx * deep + fy * wide + wx + sx; // 오른쪽 = (fy, -fx)
    const dy = fy * deep - fx * wide + wy + sy;
    const tf = fallTime(count, p.order, n);
    out.push({
      at: [u.at[0] + dx / cos, u.at[1] + dy],
      dir: u.dir,
      state: u.state,
      fallen: t < tf ? 0 : clamp01((t - tf) / 0.08) * 0.8 + 0.2,
      phase: p.phase,
    });
  }
  return out;
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
