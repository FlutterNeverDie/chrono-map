/**
 * 영상용 지도 장면(개발 서버 전용) - 장면 JSON 형식과 시간 계산. 형식 설명은 RMW `scripts/map-scene.mjs` 머리 주석에 한 번만.
 * 시각 t는 모두 0~1(장면 길이는 목소리로 정해져 프레임 수만 바뀐다), 숫자 대신 marks 이름("turn", "turn+0.05")도 된다.
 * 같은 JSON이면 매번 같은 그림이 나와야 해서 무작위는 id로 씨앗을 고정한다(rng).
 */

export type LonLat = [number, number];
/** 0~1 또는 marks 이름(+/- 덧붙인 수) */
type T = number | string;

export type Ease = "inOut" | "in" | "out" | "linear";
export type UnitKind =
  | "cavalry"
  | "horse-archer"
  | "infantry"
  | "archer"
  | "camp"
  | "siege"
  | "ship"
  | "tank"
  | "artillery"
  | "plane";
export type UnitState = "march" | "charge" | "flee" | "hold";
export type FlagKind = "tug" | "cross" | "pennant" | "banner" | "none";

type Timed<X, TT> = X & { show?: [TT, TT]; fade?: [TT, TT] };

/** 장면 형식. TT = 시각의 꼴(파일은 숫자 또는 marks 이름, 풀고 나면 숫자) */
type SceneOf<TT> = {
  version: 1;
  year?: number;
  years?: { t: TT; year: number }[];
  theme?: "film" | "light" | "dark";
  showYear?: boolean;
  borders?: boolean;
  /** 지형(산 음영·땅 색·10m 해안선·강, RMW scripts/terrain.mjs가 미리 만듦). bbox를 주면 그 지역 */
  terrain?: boolean | { bbox: [number, number, number, number] };
  /** 산 음영 세기 0~1(기본 0.8) */
  relief?: number;
  /** 부대 그림 크기 배율(기본 1 = 키 약 22px@1280 폭). unitSize는 예전 이름 */
  unitScale?: number;
  unitSize?: number;
  marks?: Record<string, number>;
  camera: {
    t: TT;
    at: LonLat;
    zoom: number;
    tilt?: number;
    heading?: number;
    ease?: Ease;
  }[];
  /** 진영: 옷·깃발 색, 깃발 모양, 말 색(여럿이면 섞음), 쇠갑옷(몸통을 회청 쇠색으로) */
  sides?: Record<
    string,
    {
      color: string;
      flag?: FlagKind;
      horse?: string | string[];
      armor?: boolean;
    }
  >;
  units?: Timed<
    {
      id: string;
      side: string;
      kind: UnitKind;
      count?: number | { t: TT; n: number }[];
      /** 무리가 퍼진 정도(도) */
      spread?: number;
      /** 대군: 작은 실루엣 n개가 반지름 radius(도) 무리로 흐른다(sceneSwarm). count 시간표는 실제 수(예: 2000 → 400) */
      swarm?: { n: number; radius: number };
      size?: number;
      path: { t: TT; at: LonLat; state?: UnitState }[];
    },
    TT
  >[];
  arrows?: Timed<
    {
      side: string;
      style?: "advance" | "retreat" | "pincer";
      path: LonLat[];
      grow?: [TT, TT];
      width?: number;
    },
    TT
  >[];
  lines?: Timed<
    {
      side?: string;
      style: "front" | "trench" | "river" | "line";
      path: LonLat[];
      grow?: [TT, TT];
    },
    TT
  >[];
  areas?: Timed<{ side: string; polygon: LonLat[]; opacity?: number }, TT>[];
  markers?: Timed<
    { kind: "battle" | "city" | "camp"; at: LonLat; side?: string },
    TT
  >[];
};
export type SceneJson = SceneOf<T>;
export type Scene = SceneOf<number>;

/** 시각 하나: 숫자 그대로, 이름이면 marks에서("turn+0.05"처럼 더하고 빼기 가능) */
function timeOf(v: T, marks: Record<string, number>): number {
  if (typeof v === "number") return v;
  const m = /^([^+-]+?)\s*([+-]\s*[\d.]+)?$/.exec(v);
  const base = m && marks[m[1].trim()];
  if (base === undefined || base === null)
    throw new Error(`장면: marks에 없는 시각 "${v}"`);
  return base + (m?.[2] ? Number(m[2].replace(/\s/g, "")) : 0);
}

/** 장면 JSON의 모든 시각(t·show·grow·fade)을 숫자로. "_"로 시작하는 키(설명)는 뺀다 */
export function resolveScene(
  json: SceneJson,
  override: Record<string, number> = {},
): Scene {
  const marks = { ...json.marks, ...override };
  const walk = (v: unknown, key = ""): unknown => {
    if (key === "t") return timeOf(v as T, marks);
    if (
      (key === "show" || key === "grow" || key === "fade") &&
      Array.isArray(v)
    )
      return v.map((x) => timeOf(x as T, marks));
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .filter(([k]) => !k.startsWith("_"))
          .map(([k, x]) => [k, walk(x, k)]),
      );
    return v;
  };
  const scene = walk(json) as Scene;
  scene.marks = marks;
  if (!scene.camera?.length) throw new Error("장면: camera가 비었다");
  return scene;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export function ease(k: number, kind: Ease = "inOut"): number {
  if (kind === "linear") return k;
  if (kind === "in") return k * k * k;
  if (kind === "out") return 1 - Math.pow(1 - k, 3);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

/** 경도 차이를 -180~180으로(가까운 쪽으로 돈다) */
const lonGap = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/** 그 시각의 카메라: 키 사이를 보간(배율은 비율로, 경도는 가까운 쪽으로), 구간마다 뒤 키의 ease */
export function cameraAt(scene: Scene, t: number) {
  const keys = scene.camera;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const k =
    b === a || b.t <= a.t ? 0 : ease(clamp01((t - a.t) / (b.t - a.t)), b.ease);
  const lerp = (x: number, y: number) => x + (y - x) * k;
  return {
    lon: a.at[0] + lonGap(a.at[0], b.at[0]) * k,
    lat: lerp(a.at[1], b.at[1]),
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom))),
    tilt: lerp(a.tilt ?? 0, b.tilt ?? 0),
    heading: lerp(a.heading ?? 0, b.heading ?? 0),
  };
}

/** 그 시각의 국경 연도 */
export function yearAt(scene: Scene, t: number): number {
  let year = scene.year ?? scene.years?.[0]?.year ?? 1;
  for (const y of scene.years ?? []) if (y.t <= t) year = y.year;
  return year;
}

/** 보이는 정도 0~1: show 구간 밖은 0(들어오고 나갈 때 0.02 동안 서서히), fade 구간에서 1 → 0 */
export function alphaAt(
  item: { show?: number[]; fade?: number[] },
  t: number,
  from = 0,
): number {
  const [s0, s1] = item.show ?? [from, 1];
  let a = Math.min(clamp01((t - s0) / 0.02 + 1), clamp01((s1 - t) / 0.02 + 1));
  if (t < s0 || t > s1) a = 0;
  if (item.fade)
    a *=
      1 - clamp01((t - item.fade[0]) / (item.fade[1] - item.fade[0] || 1e-6));
  return a;
}

/** 자라는 정도 0~1(grow 구간에서 부드럽게) */
export function growAt(grow: number[] | undefined, t: number): number {
  if (!grow) return 1;
  return ease(clamp01((t - grow[0]) / (grow[1] - grow[0] || 1e-6)), "inOut");
}

/** 문자열 → 씨앗 고정 난수(mulberry32) */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = (h << 13) | (h >>> 19);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type P = [number, number];
/** 점들을 지나는 매끈한 곡선(캣멀롬)을 촘촘한 꺾은선으로 */
export function smooth(points: P[], per = 16): P[] {
  if (points.length < 3) {
    if (points.length < 2) return points;
    const [a, b] = points;
    return Array.from({ length: per + 1 }, (_, i) => [
      a[0] + ((b[0] - a[0]) * i) / per,
      a[1] + ((b[1] - a[1]) * i) / per,
    ]);
  }
  const out: P[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let j = i ? 1 : 0; j <= per; j++) {
      const u = j / per;
      const u2 = u * u;
      const u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * u +
          (2 * a - 5 * b + 4 * c - d) * u2 +
          (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** 꺾은선을 앞에서부터 frac만큼(0~1) 자른다 */
export function cut(line: P[], frac: number): P[] {
  if (frac >= 1 || line.length < 2) return line;
  const seg = line
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1]));
  let left = seg.reduce((s, d) => s + d, 0) * Math.max(0, frac);
  const out: P[] = [line[0]];
  for (let i = 0; i < seg.length; i++) {
    if (left >= seg[i]) {
      out.push(line[i + 1]);
      left -= seg[i];
      continue;
    }
    const k = seg[i] ? left / seg[i] : 0;
    out.push([
      line[i][0] + (line[i + 1][0] - line[i][0]) * k,
      line[i][1] + (line[i + 1][1] - line[i][1]) * k,
    ]);
    break;
  }
  return out;
}

/** 부대의 그 시각 자리(경위도)·상태·움직이는 방향(경위도 차이). 경로 키 사이는 매끈하게 */
export function unitAt(
  path: { t: number; at: LonLat; state?: UnitState }[],
  t: number,
): { at: LonLat; state: UnitState; dir: LonLat } {
  if (t <= path[0].t || path.length === 1) {
    const d = path[1] ? sub(path[1].at, path[0].at) : ([1, 0] as LonLat);
    return { at: path[0].at, state: path[0].state ?? "hold", dir: d };
  }
  let i = 0;
  while (i < path.length - 2 && path[i + 1].t <= t) i++;
  const a = path[i];
  const b = path[i + 1];
  if (t >= b.t) {
    return { at: b.at, state: b.state ?? "hold", dir: sub(b.at, a.at) };
  }
  const u = clamp01((t - a.t) / (b.t - a.t || 1e-6));
  const p0 = path[Math.max(0, i - 1)].at;
  const p3 = path[Math.min(path.length - 1, i + 2)].at;
  const f = (k: number, j: 0 | 1) => {
    const [x0, x1, x2, x3] = [p0[j], a.at[j], b.at[j], p3[j]];
    return (
      0.5 *
      (2 * x1 +
        (-x0 + x2) * k +
        (2 * x0 - 5 * x1 + 4 * x2 - x3) * k * k +
        (-x0 + 3 * x1 - 3 * x2 + x3) * k * k * k)
    );
  };
  const at: LonLat = [f(u, 0), f(u, 1)];
  const next: LonLat = [
    f(Math.min(1, u + 0.01), 0),
    f(Math.min(1, u + 0.01), 1),
  ];
  const moving = Math.hypot(...sub(b.at, a.at)) > 1e-6;
  return {
    at,
    state: a.state ?? (moving ? "march" : "hold"),
    dir: u < 1 ? sub(next, at) : sub(b.at, a.at),
  };
}
const sub = (a: LonLat, b: LonLat): LonLat => [a[0] - b[0], a[1] - b[1]];

/** 그 시각의 부대 수(시간표면 사이를 이어서 - 소수 부분은 쓰러지는 중인 하나) */
export function countAt(
  count: number | { t: number; n: number }[] | undefined,
  t: number,
): number {
  if (count === undefined) return 1;
  if (typeof count === "number") return count;
  if (!count.length) return 1;
  if (t <= count[0].t) return count[0].n;
  for (let i = 0; i < count.length - 1; i++) {
    const a = count[i];
    const b = count[i + 1];
    if (t <= b.t)
      return a.n + (b.n - a.n) * clamp01((t - a.t) / (b.t - a.t || 1e-6));
  }
  return count[count.length - 1].n;
}
export function maxCount(
  count: number | { t: number; n: number }[] | undefined,
): number {
  if (count === undefined) return 1;
  if (typeof count === "number") return count;
  return Math.max(1, ...count.map((c) => c.n));
}

/**
 * 무리 배치(경위도 차이): 가운데부터 바깥으로(해바라기 씨 배열 + id 씨앗 흔들기) - 줄어들 때는 바깥 것부터 빠진다.
 * 0번이 가운데(깃발을 든 대장)
 */
export function formation(
  id: string,
  n: number,
  spread: number,
  lat: number,
): LonLat[] {
  const r = rng(id);
  const out: LonLat[] = [[0, 0]];
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  for (let i = 1; i < n; i++) {
    const rad = spread * Math.sqrt(i / Math.max(1, n - 1)) * (0.85 + 0.3 * r());
    const ang = i * 2.39996 + (r() - 0.5) * 0.6;
    out.push([(rad * Math.cos(ang)) / cos, rad * Math.sin(ang) * 0.75]);
  }
  return out;
}

/** 지형 자료(terrain.mjs가 만든 terrain.json + 그림 주소) */
export type Terrain = {
  bbox: [number, number, number, number];
  land: LonLat[][];
  lakes: LonLat[][];
  rivers: { w: number; l: LonLat[] }[];
  color: string;
  shade: string;
};
