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
  /**
   * 국경 연도 키. flow: 앞 키에서 이 키까지 연도가 t에 따라 흐른다(타임랩스 - every년마다 국경이 바뀌고, 바뀌기 전 blend(기본 0.35)
   * 동안 앞뒤 국경이 녹아 넘어간다, showYear 숫자도 그때 굴러감). 고정밀 국경은 그 사이 every년마다 필요(RMW가 만듦)
   */
  years?: { t: TT; year: number; flow?: boolean; every?: number; blend?: number; ease?: Ease }[];
  theme?: "film" | "light" | "dark";
  showYear?: boolean;
  borders?: boolean;
  /** 해안 채우기(km, 기본 30): 해안에서 이만큼 안쪽의 나라 없는 땅을 이웃 나라 색으로(국경 원본이 해안까지 오지 않는다), 0이면 끔 */
  coastFill?: number;
  /** 지형(산 음영·땅 색·10m 해안선·강, RMW scripts/terrain.mjs가 미리 만듦). bbox를 주면 그 지역 */
  terrain?: boolean | { bbox: [number, number, number, number] };
  /** 산 음영 세기 0~1(기본 0.8) */
  relief?: number;
  /** 지형 땅 색: palette(기본 - Blender 시네마틱과 같은 팔레트로 다시 칠함) | css(예전 SVG판 색) | raw(토지 피복 그대로) */
  ground?: "palette" | "css" | "raw";
  /** 땅 팔레트(RMW blender/shots의 palette와 같은 이름: steppe, steppe_dry, green, forest, water) */
  palette?: Partial<
    Record<"steppe" | "steppe_dry" | "green" | "forest" | "rock" | "rock_dark" | "snow" | "water", string>
  >;
  /** 눈 선(고도 m, 기본 3400 - prep_terrain.py의 snowline_m) */
  snowline?: number;
  /** 필름 마감(RMW blender/post.py와 같은 이름 + curve 0~1) - film 테마는 기본으로 켜짐, null이면 끔 */
  grade?: Partial<{
    exposure: number;
    curve: number;
    lift: [number, number, number];
    white: [number, number, number];
    contrast: number;
    saturation: number;
    vignette: number;
    grain: number;
  }> | null;
  /** 부대 그림 크기 배율(기본 1 = 키 약 22px@1280 폭). unitSize는 예전 이름 */
  unitScale?: number;
  unitSize?: number;
  marks?: Record<string, number>;
  camera: {
    t: TT;
    /** 카메라 가운데(경위도). follow를 주면 없어도 된다 */
    at?: LonLat;
    /**
     * 부대 따라가기(units의 id): 이 키가 쓰이는 동안(앞 키에서 넘어올 때·다음 키로 넘어갈 때도) 가운데가 그 부대 자리를
     * 따라간다 - 지난 0.04를 평균해 흔들림 없이 조금 늦게, lead(화면 가로 폭 비율, 기본 0.12)만큼 가는 쪽 앞을 비워 둔다
     */
    follow?: string;
    lead?: number;
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
      /** 같은 편(같은 team끼리는 서로 밀어내지 않고 지나갈 수 있다 - 없으면 진영마다 따로) */
      team?: string;
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
      swarm?: {
        n: number;
        radius: number;
        /** host(기본, 앞이 넓은 무리) | mass(둥근 덩어리) | ring(둘레를 에워쌈, 각자 가운데를 봄) */
        shape?: "host" | "mass" | "ring";
        /** ring 안쪽 반지름 비율(기본 0.6) */
        inner?: number;
      };
      size?: number;
      /**
       * 배 종류(kind "ship"): galley(갤리선 - 노)·sail(범선, 기본)·junk(정크선 - 몽골·고려 함대)·warship(근대 군함).
       * 대군(swarm)이면 함대 대형으로, 움직이면 항적, 수가 줄면 불타다 가라앉는다. 지형이 있으면 물 위로
       */
      vessel?: "galley" | "sail" | "junk" | "warship";
      /**
       * 비행기(kind "plane"): fighter(전투기)·bomber(폭격기, 기본). altitude = 나는 높이(그림 단위, 기본 110 - 땅 위 자리에는
       * 그림자). 대군(swarm)이면 편대, 수가 줄면 연기를 끌며 떨어진다
       */
      aircraft?: "fighter" | "bomber";
      altitude?: number;
      /**
       * 인물 얼굴 메달(부대를 따라다님): RMW public/chars의 캐릭터 id, 또는 {char, mood(표정 폴더 - front 기본·angry·happy·sad·shocked),
       * show(메달만 따로 나타날 구간), size(배율, 기본 1 - 지름이 화면 높이의 9.5%)}. 진영 색 테두리, 나타날 때 살짝 튀어 오르고 사라질 때 작아진다
       */
      face?: string | { char: string; mood?: string; show?: [TT, TT]; size?: number };
      /**
       * 병력 숫자(부대 옆, 계기판처럼 굴러감): 수 하나, 시간표 [{t, n}](사이를 이어서 줄어듦), 또는 {n, show, size}.
       * 천 단위 쉼표, 숫자만(언어 무관), 크기는 글자 높이가 화면 높이의 4.5% × size
       */
      troops?:
        | number
        | { t: TT; n: number }[]
        | { n: number | { t: TT; n: number }[]; show?: [TT, TT]; size?: number };
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
  /** 진지: wagons = 수레 원진(수레 n대가 반지름 radius(도) 고리로, 안쪽은 밟힌 땅). 그 둘레 포위는 units의 swarm.shape "ring" */
  forts?: Timed<
    {
      kind: "wagons";
      side: string;
      at: LonLat;
      radius: number;
      n?: number;
    },
    TT
  >[];
  /**
   * 표시. siege(sack도 같음) = 포위된 성벽 도시(서 있는 그림, side 색 깃발): burn 구간에 불길이 커졌다가 잦아들고 연기 기둥이
   * 오르며(뒤로 잔불·옅은 연기), fall 구간 앞 40%에 성벽에 금이 가고 나머지에 무너져 폐허가 된다. 크기는 radius(땅 위, 도)와 size(멀리서 최소 크기 배율) 중 큰 쪽
   */
  markers?: Timed<
    {
      kind: "battle" | "city" | "camp" | "siege" | "sack" | "face" | "bombing" | "flak";
      /** bombing·flak: 터지는 수(기본 12·16), show 구간에 고르게 흩어져 radius(도) 안에서. flak은 altitude 높이 둘레 공중 */
      n?: number;
      altitude?: number;
      /** face: 캐릭터 id·표정(그 지점에 얼굴 메달, size 배율 기본 1) */
      char?: string;
      mood?: string;
      at: LonLat;
      side?: string;
      burn?: [TT, TT];
      fall?: [TT, TT];
      /** siege: 땅 위 반지름(도, 기본 0.03) - 확대하면 이 크기로 커진다 */
      radius?: number;
      size?: number;
    },
    TT
  >[];
  /**
   * 폭풍(태풍 - 몽골의 일본 원정 1274·1281): strength 0~1 또는 시간표 [{t, n}] - 화면이 어둡고, 비가 바람에 비껴 쏟아지고,
   * 바다에 흰 물결이 일고, 배가 크게 흔들린다. lightning(기본 true)이면 가끔 번개로 화면이 번쩍(같은 t면 같은 때)
   */
  storm?: {
    strength: number | { t: TT; n: number }[];
    lightning?: boolean;
    wind?: number;
  };
  /**
   * 겨울: cover(눈 덮인 땅 0~1 - 지형 장면은 바람에 쓸린 얼룩·숲은 나무가 비침, 지형 밖 땅은 눈 색 쪽으로), fall(내리는 눈 0~1),
   * frozen(호수·강이 얼음 색), wind(눈이 옆으로 비껴 내리는 정도, 기본 0.3 - 음수면 왼쪽). cover·fall은 수 또는 시간표 [{t, n}]
   */
  winter?: {
    cover?: number | { t: TT; n: number }[];
    fall?: number | { t: TT; n: number }[];
    frozen?: boolean;
    wind?: number;
  };
  /**
   * 지역 강조(글자 없이 "여기"): 나라(국경 원본 이름 - 그 시각 연도의 영역) 또는 다각형. mode: both(기본 - 바깥은 어둡고 흐리게 +
   * 가장자리 은은한 빛), dim(바깥만), glow(빛만). strength 0~1.5(기본 1). show 구간에 서서히 들어오고 나간다
   */
  focus?: Timed<
    {
      polity?: string | string[];
      polygon?: LonLat[];
      mode?: "both" | "dim" | "glow";
      strength?: number;
    },
    TT
  >[];
  /**
   * 영역 번지기(제국이 퍼지는 장면): 나라 하나의 영역이 키 연도 사이에 물감처럼 번져 나간다. 키 구간마다 앞 연도 영역은 그대로,
   * 다음 연도 영역은 앞 영역에서 가까운 곳부터 드러나고(앞 영역이 없으면 from에서), 가장자리는 먹이 스미는 띠.
   * 덮인 곳의 다른 나라 색은 칠하지 않는다. 첫 키부터 그 나라는 장면 국경 대신 이것으로만 그린다
   */
  spread?: {
    /** 국경 원본 이름(n) - 연도마다 이름이 다르면 여럿("Mongol Khanate", "Mongol Empire") */
    polity: string | string[];
    /** 첫 키 연도에 영역이 없을 때 번지기 시작하는 곳 */
    from?: LonLat;
    /** 키: 그 시각에 그 연도 영역이 다 드러난다. 구간 사이는 inOut */
    keys: { t: TT; year: number }[];
    /** 색(없으면 그 나라 국경 색) */
    color?: string;
    /** 가장자리 굴곡 세기(기본 1) */
    rough?: number;
  }[];
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

/** 장면 JSON의 모든 시각(t·show·grow·fade·burn·fall)을 숫자로. "_"로 시작하는 키(설명)는 뺀다 */
export function resolveScene(
  json: SceneJson,
  override: Record<string, number> = {},
): Scene {
  const marks = { ...json.marks, ...override };
  const walk = (v: unknown, key = ""): unknown => {
    if (key === "t") return timeOf(v as T, marks);
    // 시각 구간 [시작, 끝](숫자·marks 이름만 - 겨울 fall처럼 같은 이름의 시간표 [{t, n}]는 아래에서 t만 푼다)
    if (
      (key === "show" ||
        key === "grow" ||
        key === "fade" ||
        key === "burn" ||
        key === "fall") &&
      Array.isArray(v) &&
      v.every((x) => typeof x === "number" || typeof x === "string")
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

/** 따라가는 부대 자리: 지난 0.04를 9번 잰 평균(흔들림 없이 조금 늦게) */
function followAt(path: { t: number; at: LonLat; state?: UnitState }[], t: number): LonLat {
  let x = 0;
  let y = 0;
  for (let i = 0; i < 9; i++) {
    const p = unitAt(path, t - (0.04 * i) / 8).at;
    x += p[0];
    y += p[1];
  }
  return [x / 9, y / 9];
}

/** 카메라 키의 그 시각 가운데: at 그대로, 또는 따라가는 부대 자리 + 가는 쪽 앞 여유(멈추면 여유도 서서히 0) */
function keyAt(
  scene: Scene,
  key: Scene["camera"][number],
  t: number,
): LonLat {
  if (!key.follow) {
    if (!key.at) throw new Error("장면: camera 키에 at이나 follow가 필요하다");
    return key.at;
  }
  const u = scene.units?.find((x) => x.id === key.follow);
  if (!u?.path.length) throw new Error(`장면: camera follow "${key.follow}" 부대가 없다`);
  const p = followAt(u.path, t);
  const q = followAt(u.path, t - 0.05);
  const cos = Math.max(0.2, Math.cos((p[1] * Math.PI) / 180));
  // 움직임(화면 비율 - 경도는 위도만큼 줄여 잰다)
  const dx = (p[0] - q[0]) * cos;
  const dy = p[1] - q[1];
  const d = Math.hypot(dx, dy);
  const width = 450 / key.zoom;
  const lead = (key.lead ?? 0.12) * width * (d > 0 ? Math.min(1, d / (0.02 * width)) : 0);
  if (!d) return p;
  return [p[0] + (dx / d) * (lead / cos), p[1] + (dy / d) * lead];
}

/** 그 시각의 카메라: 키 사이를 보간(배율은 비율로, 경도는 가까운 쪽으로), 구간마다 뒤 키의 ease. follow 키는 그 시각 부대 자리 */
export function cameraAt(scene: Scene, t: number) {
  const keys = scene.camera;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const k =
    b === a || b.t <= a.t ? 0 : ease(clamp01((t - a.t) / (b.t - a.t)), b.ease);
  const lerp = (x: number, y: number) => x + (y - x) * k;
  const pa = keyAt(scene, a, t);
  const pb = keyAt(scene, b, t);
  return {
    lon: pa[0] + lonGap(pa[0], pb[0]) * k,
    lat: lerp(pa[1], pb[1]),
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom))),
    tilt: lerp(a.tilt ?? 0, b.tilt ?? 0),
    heading: lerp(a.heading ?? 0, b.heading ?? 0),
  };
}

/**
 * 그 시각의 국경 연도: year(지금 쓰는 국경 해), value(흐르는 연도 값 - 이어지는 수), next(녹아 넘어갈
 * 다음 해 - 흐르는 구간에서만), mix(다음 해 국경 섞는 정도 0~1). flow 키 구간이 아니면 그 시각까지 지난 키의 해 그대로
 */
export function yearFlowAt(scene: Scene, t: number) {
  const keys = scene.years ?? [];
  let year = scene.year ?? keys[0]?.year ?? 1;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const prev = keys[i - 1];
    if (k.flow && prev && t >= prev.t && t < k.t) {
      const u = ease(clamp01((t - prev.t) / (k.t - prev.t || 1e-6)), k.ease ?? "linear");
      const span = k.year - prev.year;
      const dir = span < 0 ? -1 : 1;
      const every = Math.max(1, k.every ?? 1) * dir;
      const v = prev.year + span * u;
      const y0 = prev.year + Math.floor((v - prev.year) / every) * every;
      const y1 = dir > 0 ? Math.min(k.year, y0 + every) : Math.max(k.year, y0 + every);
      const frac = y1 === y0 ? 0 : (v - y0) / (y1 - y0);
      const blend = k.blend ?? 0.35;
      const k01 = clamp01((frac - (1 - blend)) / blend);
      const mix = k01 * k01 * (3 - 2 * k01);
      return { year: y0, value: v, next: y1 === y0 ? null : y1, mix };
    }
    if (k.t <= t) year = k.year;
  }
  return { year, value: year, next: null as number | null, mix: 0 };
}

/** 그 시각의 국경 연도 */
export function yearAt(scene: Scene, t: number): number {
  return yearFlowAt(scene, t).year;
}

/**
 * 보이는 정도 0~1: show 구간 밖은 0, 들어올 때(s0부터 0.02)·나갈 때(s1 전 0.02) 서서히 - 장면 처음(0)·끝(1)에 걸친 것은 바로 보임.
 * fade 구간에서 1 → 0. (예전 식은 s0에서 이미 1이라 대군 수백 기가 한 프레임에 튀어나왔다 - 깜빡임 검사에서 찾음)
 */
export function alphaAt(
  item: { show?: number[]; fade?: number[] },
  t: number,
  from = 0,
): number {
  const [s0, s1] = item.show ?? [from, 1];
  if (t < s0 || t > s1) return 0;
  let a = Math.min(
    s0 <= 0 ? 1 : clamp01((t - s0) / 0.02),
    s1 >= 1 ? 1 : clamp01((s1 - t) / 0.02),
  );
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
  /** 고도 그림(16비트 회색 PNG 주소) - 고도 m = 값 × height.scale - height.offset */
  heightmap?: string;
  height?: { offset: number; scale: number };
  /** 격자 크기(원래 그림 가로·세로 점 수) */
  size?: [number, number];
};
