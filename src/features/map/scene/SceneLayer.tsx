"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  bodyCenter,
  bodyDepth,
  bodyOf,
  bodyReach,
  levelOf,
  setSceneSeconds,
  swarmAt,
  tOf,
} from "./sceneSwarm";
import { landMask, toLand, toWater } from "./sceneLand";
import { drawCrowd, type Figure, type GroupShade } from "./sceneCrowd";
import { useScene } from "./sceneStore";
import { SceneGl } from "./SceneGl";
import type { GlView } from "@/components/map/gl/renderer";
import type { Feature, FeatureCollection } from "geojson";
import type { Polity } from "../borders";
import { MAP_WIDTH, makeProjection } from "../baseMap";
import { tiltTransform } from "@/components/map/tilt";
import {
  alphaAt,
  cameraAt,
  countAt,
  cut,
  formation,
  growAt,
  maxCount,
  resolveScene,
  rng,
  smooth,
  unitAt,
  yearAt,
  yearFlowAt,
  type LonLat,
  type Scene,
  type SceneJson,
  type Terrain,
} from "./sceneData";
import { faceKey, prepareFaces } from "./sceneFace";
import {
  BattleCloud,
  CityArt,
  FaceMedal,
  Bomb,
  Flak,
  TroopCount,
  Dust,
  SmokeColumn,
  Flag,
  INK,
  MarkerArt,
  Shadow,
  UnitArt,
  WagonArt,
} from "./sceneArt";

/** 꺾은선 길이 */
const pathLen = (l: [number, number][]) =>
  l
    .slice(1)
    .reduce((s, p, i) => s + Math.hypot(p[0] - l[i][0], p[1] - l[i][1]), 0);

/**
 * 영상용 지도 장면 층(개발 서버 `?scene`에서만 - 운영 빌드에는 이 파일이 들어가지 않는다, WorldMap의 SCENE_DEV).
 * 캡처 스크립트(RMW `scripts/map-scene.mjs`)가 `window.__scene.load(json)` → 프레임마다 `await __scene.seek(t)` 뒤 찍는다.
 * - plane: 지도 판 안(기울이고 돌리는 판과 같이 눕는다) - 화살표·전선·참호·칠한 곳·도시 점
 * - screen: 지도 칸 위(눕지 않음) - 부대·전투 표시를 서 있는 그림으로, 판 위 자리를 화면으로 옮겨(원근 크기까지) 그린다
 */

/** 지도가 그린 화면(WorldMap이 그리는 그대로 넘김) */
export type SceneGeo = {
  v: { x: number; y: number; w: number; h: number };
  size: { w: number; h: number };
  frame: { w: number; h: number };
  lon: number;
  heading: number;
  tilt: number;
};
/** WorldMap이 장면에 내주는 조작 */
export type SceneHost = {
  apply: (c: {
    lon: number;
    lat: number;
    zoom: number;
    tilt: number;
    heading: number;
    year: number;
  }) => void;
  /** apply한 화면을 다 그렸고 국경·해안선도 받았는지 */
  ready: () => boolean;
  /** (개발 확인용) 지금 화면에 보이는 핀의 화면 위치(client px) - 기울이거나 돌리지 않았을 때 */
  pins?: () => { id: string; x: number; y: number; more: number }[];
};

const projection = makeProjection(0);
const project = (p: LonLat): [number, number] => {
  const q = projection(p);
  return q ? [q[0], q[1]] : [0, 0];
};

const STYLE_ID = "scene-style";
/** 장면 모드 화면: 지도만 전체 화면, 나머지(제목·하단 바·패널·나침반) 숨김, 영상 톤(film) */
const CSS = `
html[data-scene] div:has(> [data-map-frame]) ~ *, html[data-scene] nav, html[data-scene] [data-map-overlay] { display: none !important; }
html[data-scene] [data-map-frame] { position: fixed !important; inset: 0 !important; z-index: 60; cursor: default !important; }
html[data-scene-borders="off"] [data-polity] { display: none; }
html[data-scene-theme="film"] {
  --map-ocean: #5f7486; --map-land: #b6a585; --map-border: #4d3f2c; --map-region-opacity: 0.32;
  --map-graticule: transparent; --map-sky: #3a3f3c;
}
/* 해안선을 따라 옅은 띠(물가가 물로 읽히게) - 해안선 선을 넓고 옅게 */
html[data-scene-theme="film"] [data-map-frame] svg[role="img"] path[fill="none"][stroke="var(--map-border)"] {
  stroke: #9fb1bb; stroke-opacity: 0.55; stroke-width: calc(5 * var(--px)) !important;
}
html[data-scene-theme="film"] [data-map-frame] svg[role="img"] { filter: sepia(0.3) saturate(0.65) brightness(0.92); }
/* WebGL 장면 판(SceneGl)이 바다·땅·지형·나라 색·해안·판 층을 그리고 화면 층(대군 canvas·부대 svg)은 구워 얹는다 - 화면에는 그 판만 */
html[data-scene-gl] [data-map-frame] svg[role="img"],
html[data-scene-gl] [data-scene-crowd],
html[data-scene-gl] [data-scene-sprites] { visibility: hidden; }
`;

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

declare global {
  interface Window {
    __scene?: {
      load: (
        json: SceneJson,
        opts?: {
          frames?: number;
          marks?: Record<string, number>;
          terrain?: Terrain;
          /** 고정밀 국경: 연도 → GeoJSON 주소(scripts/scene-borders.mjs 결과) */
          borders?: Record<string, string>;
        },
      ) => Promise<void>;
      seek: (t: number) => Promise<void>;
      info: () => { loaded: boolean; t: number };
    };
  }
}

/** 장면 조작을 window에 단다(screen 층 하나만) */
function useSceneApi(host: { current: SceneHost | null }) {
  useEffect(() => {
    const html = document.documentElement;
    const seek = async (t: number) => {
      const { scene } = useScene.getState();
      const h = host.current;
      if (!scene || !h) throw new Error("장면을 먼저 load");
      useScene.setState({ t });
      h.apply({ ...cameraAt(scene, t), year: yearAt(scene, t) });
      // 다 그리고(React 커밋·기울기 effect) 국경·자세한 해안선을 받을 때까지, 그다음 두 프레임(그리기·굽기 끝)
      const start = performance.now();
      await frame();
      // 지도(국경·해안선)와 WebGL 장면 판(지형 그림·나라 삼각형)을 다 받을 때까지
      const glReady = () => useScene.getState().gl?.ready() ?? false;
      while (!h.ready() || !glReady()) {
        if (performance.now() - start > 20000)
          throw new Error(`장면 ${t}: 20초 안에 그리지 못함`);
        await wait(16);
      }
      // 그 시각을 WebGL 판에 한 장(판 층 + 구운 화면 층 + 마감, preserveDrawingBuffer라 캡처가 이 그림을 읽는다)
      await useScene.getState().gl?.draw();
      await frame();
    };
    window.__scene = {
      async load(json, opts = {}) {
        const scene = resolveScene(json, opts.marks);
        const terrain = scene.terrain && opts.terrain ? opts.terrain : null;
        if (terrain) html.dataset.sceneTerrain = "";
        else delete html.dataset.sceneTerrain;
        if (!document.getElementById(STYLE_ID)) {
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = CSS;
          document.head.appendChild(style);
        }
        html.dataset.scene = "";
        if (scene.theme === "film") html.dataset.sceneTheme = "film";
        else delete html.dataset.sceneTheme;
        if (scene.theme === "dark") html.dataset.theme = "dark";
        else if (scene.theme === "light") delete html.dataset.theme;
        if (scene.borders === false) html.dataset.sceneBorders = "off";
        else delete html.dataset.sceneBorders;
        // 인물 얼굴 메달 그림을 먼저 다 만든다(그릴 때 기다리지 않게)
        const faces = await prepareFaces(scene);
        useScene.setState({
          scene,
          faces,
          frames: opts.frames ?? 300,
          t: 0,
          terrain,
          borders: opts.borders ?? null,
        });
        await seek(0);
      },
      seek,
      info: () => ({
        loaded: !!useScene.getState().scene,
        t: useScene.getState().t,
      }),
    };
    return () => {
      delete window.__scene;
    };
  }, [host]);
}

/** 지도 좌표 x를 지금 화면 가운데에 가장 가까운 복사본으로(지도가 끝없이 이어져서) */
function nearX(x: number, shift: number, view: SceneGeo["v"]) {
  const c = view.x + view.w / 2;
  const o = x + shift;
  return o + Math.round((c - o) / MAP_WIDTH) * MAP_WIDTH;
}
/** 경위도 꺾은선 → 지도 좌표(날짜변경선을 넘어도 이어지게) */
function projectLine(
  pts: LonLat[],
  shift: number,
  view: SceneGeo["v"],
): [number, number][] {
  const out: [number, number][] = [];
  for (const p of pts) {
    const [x, y] = project(p);
    if (!out.length) out.push([nearX(x, shift, view), y]);
    else {
      const prev = out[out.length - 1][0];
      const raw = x + shift;
      out.push([raw + Math.round((prev - raw) / MAP_WIDTH) * MAP_WIDTH, y]);
    }
  }
  return out;
}
const d = (pts: [number, number][], close = false) =>
  pts.length
    ? `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}${close ? "Z" : ""}`
    : "";

const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/**
 * 얼굴 메달 크기 0~1: 나타날 때 0.03 동안 조금 넘쳤다 돌아오고(backOut, 과하지 않게), 사라질 때 0.02 동안 작아진다.
 * 장면 처음·끝에 걸친 것은 바로
 */
/**
 * 얼굴 메달 그림 배율: 지름(그림 60)이 화면 높이의 9.5%(1440p에서 약 137px - 휴대폰으로 봐도 얼굴이 또렷이) × size,
 * 원근으로 멀어져도 줄지 않고 가까우면 조금(최대 1.3배) 커진다. 테두리·고리 굵기도 같은 비율로
 */
const medalPx = (frameH: number, size: number, k: number) =>
  ((frameH * 0.095) / 60) * size * Math.max(1, Math.min(1.3, k));

function medalScale(show: number[] | undefined, t: number): number {
  const [s0, s1] = show ?? [0, 1];
  if (t < s0 || t > s1) return 0;
  const a = s0 <= 0 ? 1 : Math.min(1, (t - s0) / 0.03);
  const b = s1 >= 1 ? 1 : Math.min(1, (s1 - t) / 0.02);
  const x = a - 1;
  const pop = 1 + 2.2 * x * x * x + 1.2 * x * x;
  return Math.max(0, pop) * smoothstep(0, 1, b);
}

/** 지도 판 위 점(판 안 CSS px) → 화면(지도 칸 안 CSS px): 돌리기(판 가운데 = 지도 칸 가운데) → 눕히기(아래 가운데 축, 원근) */
function toScreen(geo: SceneGeo) {
  const { size, frame: f, heading, tilt } = geo;
  const a = (-heading * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const m = tilt ? new DOMMatrix(tiltTransform(tilt, f.h)) : null;
  const flat = (px: number, py: number): [number, number] => {
    // 판 안 점 → 지도 칸 안 점(판은 가운데 맞춤으로 놓여 -heading 돌아 있다)
    const x = px - size.w / 2;
    const y = py - size.h / 2;
    return [f.w / 2 + x * cos - y * sin, f.h / 2 + x * sin + y * cos];
  };
  const lift = ([x, y]: [number, number]): [number, number] => {
    if (!m) return [x, y];
    const q = m.transformPoint(new DOMPoint(x - f.w / 2, y - f.h, 0, 1));
    return [f.w / 2 + q.x / q.w, f.h + q.y / q.w];
  };
  return (px: number, py: number) => {
    const p = flat(px, py);
    const s = lift(p);
    // 그 자리의 원근 배율(화면 가로 1px이 얼마로 보이나)
    const s2 = lift([p[0] + 1, p[1]]);
    return { x: s[0], y: s[1], k: Math.hypot(s2[0] - s[0], s2[1] - s[1]) };
  };
}

function ScreenLayer({
  scene,
  t,
  frames,
  geo,
  terrain,
}: {
  scene: Scene;
  t: number;
  frames: number;
  geo: SceneGeo;
  terrain: Terrain | null;
}) {
  const { v, size, frame: f } = geo;
  const shift = (-geo.lon * MAP_WIDTH) / 360;
  const screen = toScreen(geo);
  const faces = useScene((s) => s.faces);
  /** 경위도 → 화면 */
  const at = (p: LonLat) => {
    const [x, y] = project(p);
    const X = nearX(x, shift, v);
    return screen(((X - v.x) / v.w) * size.w, ((y - v.y) / v.h) * size.h);
  };
  const time = (t * frames) / 30;
  setSceneSeconds(frames / 30);
  // 폭풍 세기(배가 크게 흔들림 - 화면 효과는 WebGL 판)
  const storm = scene.storm ? Math.min(1, countAt(scene.storm.strength, t)) : 0;
  // 부대 그림 크기: 기본은 키 약 22px@1280(영상 44px) - 크면 보드게임 말처럼 보여 작게 많이(RMW 피드백)
  const base = (scene.unitScale ?? scene.unitSize ?? 1) * 0.45;
  /** 접전 먼지·화살표처럼 부대보다 위에 그릴 것 */
  const over: ReactNode[] = [];
  const sprites: { y: number; node: ReactNode }[] = [];

  /** 대군 실루엣(canvas에 그린다 - svg로 수천 개는 너무 무거움, 그리기는 sceneCrowd) */
  const crowd: Figure[] = [];
  const shades = new Map<number, GroupShade>();
  const team = (side: string) => scene.sides?.[side]?.team ?? side;
  const water = terrain ? landMask(terrain) : null;
  const swarms = (scene.units ?? [])
    .map((u, group) => ({ u, group }))
    .filter(({ u }) => u.swarm && u.path.length && alphaAt(u, t, u.path[0].t))
    .map(({ u, group }) => {
      const body = bodyOf(u.path, u.swarm!, t);
      const cols = Math.max(1, Math.round(Math.sqrt(u.swarm!.n * 3)));
      return {
        u,
        group,
        body,
        pos: unitAt(u.path, t),
        R: u.swarm!.radius,
        ring: u.swarm!.shape === "ring",
        /** 맞붙는 정도(돌격 중이면 1, 키에서 부드럽게) */
        contact: levelOf(u.path, t, "charge"),
        /** 밀어낼 때의 무게(살아 있는 수 - 큰 군대가 덜 밀린다, 버티고 선 무리는 3배 - 돌격해 온 쪽이 그 앞에서 멈춘다) */
        mass:
          Math.max(1, countAt(u.count, t) || u.swarm!.n) *
          (1 + 2 * levelOf(u.path, t, "hold")),
        /** 무리 안 이웃 간격(도) */
        gap: (2 * u.swarm!.radius) / Math.max(1, cols - 1),
        shift: [0, 0] as [number, number],
      };
    });
  const cosOf = (lat: number) => Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  /** 무리 몸통 가운데(밀어낸 자리까지) */
  const centerOf = (w: (typeof swarms)[number]): LonLat => {
    const c = bodyCenter(w.body);
    return [c[0] + w.shift[0], c[1] + w.shift[1]];
  };
  // 적 무리끼리 겹치면 서로 밀어 틈을 둔다(실루엣 3개 폭, 몸통 타원 기준) - 맞붙으면(돌격) 앞줄만 조금 파고들게.
  // 한 번에 밀면 셋 이상 얽힐 때 다시 겹쳐서 여러 번 고르게 민다. 큰 군대·버티고 선 무리일수록 덜 밀린다. 같은 편(team)은 60%까지
  // 겹쳐도 되게만 살짝(세게 밀면 거의 겹친 몽골 세 갈래가 풀 길이 없는 밀기로 크게 미끄러졌다), 둘러싸는 고리는 밀지 않는다.
  // 한 무리는 제 반지름까지만 밀린다(장면이 정한 자리를 크게 벗어나지 않게). t만으로 정해지되, 지난 짧은 시간의
  // 평균(아래 SMOOTH)을 써서 밀기가 빨리 바뀌는 곳도 부드럽게 움직인다(앞 프레임과 무관 - 같은 t면 같은 값).
  // 한 무리가 다른 무리를 덮어 진영 경계가 안 보였고, 쿠만이 몽골 덩어리 안에 섞였다(RMW 피드백)
  const separation = (tt: number) => {
    const list = swarms.map((w) => ({
      w,
      /** 보이는 정도(나타나는 동안 밀기도 서서히 - 나타나는 순간 이웃 무리가 한 프레임에 밀려났다) */
      seen: alphaAt(w.u, tt, w.u.path[0].t),
      body: bodyOf(w.u.path, w.u.swarm!, tt),
      contact: levelOf(w.u.path, tt, "charge"),
      mass:
        Math.max(1, countAt(w.u.count, tt) || w.u.swarm!.n) *
        (1 + 2 * levelOf(w.u.path, tt, "hold")),
      shift: [0, 0] as [number, number],
    }));
    const centre = (x: (typeof list)[number]): LonLat => {
      const c = bodyCenter(x.body);
      return [c[0] + x.shift[0], c[1] + x.shift[1]];
    };
    for (let pass = 0; pass < 8; pass++)
      for (let a = 0; a < list.length; a++)
        for (let b = a + 1; b < list.length; b++) {
          const A = list[a];
          const B = list[b];
          // 고리·밀지 않는 무리(press: false - 포위처럼 일부러 겹침)는 밀어내지 않는다
          if (
            A.w.ring ||
            B.w.ring ||
            A.w.u.press === false ||
            B.w.u.press === false
          )
            continue;
          const friends = team(A.w.u.side) === team(B.w.u.side);
          const ca = centre(A);
          const cb = centre(B);
          const cos = cosOf((ca[1] + cb[1]) / 2);
          const dx = (cb[0] - ca[0]) * cos;
          const dy = cb[1] - ca[1];
          const dist = Math.hypot(dx, dy) || 1e-6;
          const ux = dx / dist;
          const uy = dy / dist;
          const reach = bodyReach(A.body, ux, uy) + bodyReach(B.body, ux, uy);
          const contact = Math.max(A.contact, B.contact);
          // 같은 편은 많이 겹쳐도 되게(60%까지) - 거의 같은 자리에 둔 몽골 세 갈래가 네모난 한 덩어리로 보이지 않을 만큼만
          const want = friends
            ? reach * 0.6
            : reach * (1 - 0.06 * contact) +
              3 * Math.max(A.w.gap, B.w.gap) * (1 - contact);
          if (dist >= want) continue;
          const push = (want - dist) * Math.min(A.seen, B.seen);
          const wa = B.mass / (A.mass + B.mass);
          A.shift[0] -= (ux * push * wa) / cos;
          A.shift[1] -= uy * push * wa;
          B.shift[0] += (ux * push * (1 - wa)) / cos;
          B.shift[1] += uy * push * (1 - wa);
        }
    return list.map((x) => {
      const cos = cosOf(x.body.at[1]);
      const len = Math.hypot(x.shift[0] * cos, x.shift[1]);
      const k = len > x.w.R ? x.w.R / len : 1;
      return [x.shift[0] * k, x.shift[1] * k] as [number, number];
    });
  };
  // 지난 3초를 7번 재서 가까울수록 무겁게 평균 - 돌격해 들어간 몽골이 버티는 쿠만에 9프레임 만에 확 밀려났다
  const SMOOTH = [0, 1, 2, 3, 4, 5, 6].map((k) => tOf(0.5 * k));
  const weight = SMOOTH.map((dt) => 1 - dt / tOf(3.5));
  const total = weight.reduce((a, b) => a + b, 0);
  SMOOTH.forEach((dt, k) => {
    const sh = separation(t - dt);
    swarms.forEach((w, i) => {
      w.shift[0] += (sh[i][0] * weight[k]) / total;
      w.shift[1] += (sh[i][1] * weight[k]) / total;
    });
  });
  // 크기: 무리 안 간격의 1.4배(빽빽한 무리는 조금 겹쳐야 무리로 보인다, 멀리서는 점, 다가가면 실루엣) 모든 무리를 같은 화면 크기로 - 보병만 점처럼 작았다
  let common = Infinity;
  let floor = 0;
  for (const w of swarms) {
    const mid = w.pos.at;
    const c0 = at(mid);
    const c1 = at([
      mid[0] + w.gap / Math.max(0.2, Math.cos((mid[1] * Math.PI) / 180)),
      mid[1],
    ]);
    common = Math.min(
      common,
      (Math.hypot(c1.x - c0.x, c1.y - c0.y) * 1.4) / (40 * c0.k),
      base * (w.u.size ?? 1) * 0.6,
    );
    // 바닥: 화면 키 18px(영상 36px) 아래로는 줄이지 않는다 - 간격에만 맞추면 1200명 무리는 말·병사가 너무 작았다(사용자).
    // 촘촘하면 조금 겹치지만 하나하나 읽힌다. 아주 멀리(키 6px 아래로 가는 원근)는 그대로 점
    floor = Math.max(floor, 18 / (48 * c0.k));
  }
  // 바닥은 무리가 아주 빽빽할 때(간격 크기가 바닥의 1/4 아래)만 서서히 풀어 점 무리로 - 먼 거리 대군이 겹친 실루엣의 먹선으로
  // 검은 갈색 덩어리가 됐다(RMW). 보통 거리는 그대로 바닥(키 18px)
  if (Number.isFinite(common))
    common = Math.max(
      common,
      floor * smoothstep(0.12, 0.3, common / Math.max(floor, 1e-9)),
    );
  for (const w of swarms) {
    const { u, group, R, shift } = w;
    const alpha = alphaAt(u, t, u.path[0].t);
    const side = scene.sides?.[u.side];
    const horses = side?.horse
      ? Array.isArray(side.horse)
        ? side.horse
        : [side.horse]
      : ["#8b5e3c"];
    const me = centerOf(w);
    const foes = swarms.filter(
      (o) =>
        o !== w &&
        !o.ring &&
        o.u.press !== false &&
        u.press !== false &&
        team(o.u.side) !== team(u.side),
    );
    // 패주: 가장 가까운 적의 반대쪽으로
    let away: [number, number] | undefined;
    let near = Infinity;
    for (const o of foes) {
      const c = centerOf(o);
      const cos = cosOf(me[1]);
      const dx = (me[0] - c[0]) * cos;
      const dy = me[1] - c[1];
      const d = Math.hypot(dx, dy);
      if (d > 1e-9 && d < near) {
        near = d;
        away = [dx / d, dy / d];
      }
    }
    const men = swarmAt(u.id, u.path, u.swarm!, u.count, t, away, u.fallFrom);
    const anchor = unitAt(u.path, t).at;
    const home: LonLat = [anchor[0] + shift[0], anchor[1] + shift[1]];
    // 적 무리 몸통 안에 들어간 사람은 그 둘레 밖으로(사람마다 조금씩 다른 거리 - 한 줄로 늘어서지 않게).
    // 맞붙은 동안은 둘레 조금 안쪽까지. 서로 다른 진영이 한 덩어리로 섞여 보이지 않게
    for (const m of men) {
      m.at = [m.at[0] + shift[0], m.at[1] + shift[1]];
      for (const o of foes) {
        const c = centerOf(o);
        const cos = cosOf(c[1]);
        const dx = (m.at[0] - c[0]) * cos;
        const dy = m.at[1] - c[1];
        const depth = bodyDepth(o.body, dx, dy);
        const edge =
          (1 - 0.06 * Math.max(o.contact, w.contact)) * (1 + 0.15 * m.slack);
        if (depth >= edge) continue;
        // 깊이 들어간 병사는 그대로(섞여 싸움), 가장자리 쪽만 서서히 밖으로 - 한가운데 병사를 내 무리 쪽으로 빼면 적 무리
        // 가운데가 지나가는 순간 빼는 방향이 뒤집혀 반대편으로 순간이동했다(사용자 "몽골 말이 엄청 빠르게")
        const wpush = smoothstep(0.35, 0.65, depth / edge);
        if (wpush <= 0) continue;
        // 둘레 바로 밖 띠로 펼친다(안쪽 깊이 비례) - 둘레에 그대로 모으면 한 줄로 늘어선 선이 보였다
        const k = 1 + ((edge + (edge - depth) * 0.45) / depth - 1) * wpush;
        m.at = [c[0] + (dx * k) / cos, c[1] + dy * k];
      }
      // 물 위에 선 사람은 무리 가운데 쪽 땅으로(밀어내기에 밀려 바다로 나가기도 해서), 배는 거꾸로 물로
      if (water && u.kind !== "plane")
        m.at =
          u.kind === "ship"
            ? toWater(water, m.at, home, R)
            : toLand(water, m.at, home, R);
    }
    // 무리 바닥 그림자: 살아 있는 사람들의 가운데·퍼짐
    let sx = 0;
    let sy = 0;
    let live = 0;
    men.forEach((m, i) => {
      if (m.fallen >= 1) return;
      const p = at(m.at);
      if (!m.fallen) {
        sx += p.x;
        sy += p.y;
        live++;
      }
      if (p.x < -60 || p.x > f.w + 60 || p.y < -60 || p.y > f.h + 60) return;
      const q = at([m.at[0] + m.dir[0] * 0.01, m.at[1] + m.dir[1] * 0.01]);
      const fast = m.state === "charge" || m.state === "flee";
      crowd.push({
        group,
        x: p.x,
        y: p.y,
        s: p.k * common,
        face: q.x < p.x - 1e-4 ? -1 : 1,
        kind: u.kind,
        color: side?.color ?? "#8a7a5c",
        horse: horses[i % horses.length],
        armor: !!side?.armor,
        phase: time * Math.PI * 2 * (fast ? 3 : 1.7) + m.phase,
        fast,
        fallen: m.fallen,
        alpha,
        vessel: u.vessel,
        moving: m.state !== "hold",
        rock: storm,
        aircraft: u.aircraft,
        alt: u.altitude,
      });
    });
    if (live && !w.ring) {
      const c = at(unitAt(u.path, t).at);
      const e = at([
        unitAt(u.path, t).at[0] +
          R /
            Math.max(0.2, Math.cos((unitAt(u.path, t).at[1] * Math.PI) / 180)),
        unitAt(u.path, t).at[1],
      ]);
      const rx = Math.hypot(e.x - c.x, e.y - c.y) * 1.15;
      // 그리는 순서는 층, 그다음 부대 기준점(밀린 만큼 포함)의 화면 y - 살아 있는 병사 가운데로 하면 쓰러질수록 움직여 순서가 중간에 뒤집혔다
      const z = at(centerOf(w)).y;
      shades.set(group, {
        x: sx / live,
        y: sy / live,
        z: (u.layer ?? 0) * 1e6 + z,
        rx,
        ry: rx * 0.42,
        alpha,
      });
    }
  }
  scene.units?.forEach((u) => {
    const alpha = alphaAt(u, t, u.path[0]?.t ?? 0);
    if (!alpha || !u.path.length) return;
    const side = scene.sides?.[u.side];
    const color = side?.color ?? "#8a7a5c";
    const pos = unitAt(u.path, t);
    // 화면에서 움직이는 방향으로 얼굴(왼쪽이면 뒤집기)
    const p0 = at(pos.at);
    const p1 = at([
      pos.at[0] + pos.dir[0] * 0.01,
      pos.at[1] + pos.dir[1] * 0.01,
    ]);
    const face = p1.x < p0.x - 1e-4 ? -1 : 1;
    const N = maxCount(u.count);
    const n = countAt(u.count, t);
    const offs = formation(u.id, N, u.spread ?? 0.06 * Math.sqrt(N), pos.at[1]);
    const r = rng(`${u.id}:phase`);
    const horses = side?.horse
      ? Array.isArray(side.horse)
        ? side.horse
        : [side.horse]
      : [undefined];
    const fast = pos.state === "charge" || pos.state === "flee";
    // 진영 깃발: 무리 앞쪽에 크게 하나(섞여 싸울 때도 어느 무리인지 보이게)
    if (side?.flag && side.flag !== "none" && n >= 1) {
      // 대군은 밀어낸 자리의 앞줄 가운데 조금 안쪽(깃발이 무리와 떨어져 떠 있었다), 작은 부대는 무리 앞쪽
      const sw = swarms.find((w) => w.u === u);
      const len = Math.hypot(pos.dir[0], pos.dir[1]) || 1;
      const reach = (u.spread ?? 0.06 * Math.sqrt(N)) * 0.8;
      const fp = sw?.ring
        ? // 고리(포위)는 가운데가 아니라 화면 아래쪽(가까운) 둘레에
          at([pos.at[0] + sw.shift[0], pos.at[1] + sw.shift[1] - sw.R * 0.95])
        : sw
          ? at([
              pos.at[0] +
                sw.shift[0] -
                (Math.cos(sw.body.ang) * sw.R * 0.12) / cosOf(pos.at[1]),
              pos.at[1] + sw.shift[1] - Math.sin(sw.body.ang) * sw.R * 0.12,
            ])
          : at([
              pos.at[0] + (pos.dir[0] / len) * reach,
              pos.at[1] + (pos.dir[1] / len) * reach,
            ]);
      const fs = fp.k * base * 2.4 * (u.size ?? 1);
      sprites.push({
        y: fp.y + 0.01,
        node: (
          <g
            key={`${u.id}-flag`}
            transform={`translate(${fp.x.toFixed(2)} ${fp.y.toFixed(2)}) scale(${(fs * face).toFixed(4)} ${fs.toFixed(4)})`}
            opacity={alpha}
          >
            <Shadow w={8} />
            <Flag kind={side.flag} color={color} x={0} y={0} />
          </g>
        ),
      });
    }
    // 인물 얼굴 메달: 깃발(없으면 부대 가운데) 위에, 부대를 따라다닌다
    if (u.face) {
      const face: {
        char: string;
        mood?: string;
        show?: number[];
        size?: number;
      } = typeof u.face === "string" ? { char: u.face } : u.face;
      const href = faces[faceKey(face.char, face.mood)];
      const k = medalScale(face.show ?? u.show, t);
      if (href && k > 0.001) {
        const sw = swarms.find((w) => w.u === u);
        const c = sw
          ? at([pos.at[0] + sw.shift[0], pos.at[1] + sw.shift[1]])
          : p0;
        // 무리 위로 띄운다(대군은 무리 반지름의 화면 높이만큼, 작은 부대는 부대 그림 키만큼)
        const lift = sw
          ? Math.abs(at([pos.at[0], pos.at[1] + sw.R]).y - at(pos.at).y) * 0.6 +
            c.k * base * 40
          : c.k * base * 70;
        const ms = medalPx(f.h, face.size ?? 1, c.k) * k;
        const bob = Math.sin(time * 1.3 + u.id.length) * 1.2;
        over.push(
          <g
            key={`${u.id}-face`}
            transform={`translate(${c.x.toFixed(2)} ${(c.y - lift + bob).toFixed(2)}) scale(${ms.toFixed(4)})`}
            opacity={alpha * Math.min(1, k * 1.5)}
          >
            <FaceMedal href={href} color={color} id={`fc-${u.id}`} />
          </g>,
        );
      }
    }
    // 병력 숫자: 부대 오른쪽 옆(대군은 무리 몸통 오른쪽 끝), 계기판처럼 굴러감
    if (u.troops !== undefined) {
      const tr =
        typeof u.troops === "object" && !Array.isArray(u.troops)
          ? u.troops
          : { n: u.troops };
      const ta = alphaAt({ show: tr.show ?? u.show }, t);
      if (ta > 0) {
        const value = countAt(tr.n, t);
        const top = maxCount(tr.n);
        const digits = Math.max(
          1,
          Math.floor(Math.log10(Math.max(1, top))) + 1,
        );
        // 굴러가는 가장 낮은 자리: 세 자리 위만 보이되(20,000이면 100 자리까지), 한 프레임에 0.5칸보다 빨리 구르지 않게 올린다
        let step = 10 ** Math.max(0, digits - 3);
        if (Array.isArray(tr.n))
          for (let j = 0; j < tr.n.length - 1; j++) {
            const a = tr.n[j];
            const b = tr.n[j + 1];
            const perFrame =
              Math.abs(b.n - a.n) / Math.max(1e-6, (b.t - a.t) * frames);
            if (perFrame > 0)
              step = Math.max(
                step,
                10 ** Math.ceil(Math.log10(perFrame / 0.5)),
              );
          }
        step = Math.min(step, 10 ** (digits - 1));
        const sw = swarms.find((w) => w.u === u);
        const c = sw
          ? at([pos.at[0] + sw.shift[0], pos.at[1] + sw.shift[1]])
          : p0;
        const east = sw
          ? at([
              pos.at[0] + sw.shift[0] + (sw.R * 0.8) / cosOf(pos.at[1]),
              pos.at[1] + sw.shift[1],
            ])
          : at([
              pos.at[0] +
                ((u.spread ?? 0.06 * Math.sqrt(N)) * 1.3) / cosOf(pos.at[1]),
              pos.at[1],
            ]);
        const fs = f.h * 0.045 * (tr.size ?? 1);
        over.push(
          <g
            key={`${u.id}-troops`}
            transform={`translate(${(Math.max(east.x, c.x) + fs * 0.25).toFixed(2)} ${(c.y + fs * 0.35).toFixed(2)})`}
            opacity={alpha * ta}
          >
            <TroopCount
              value={value}
              step={step}
              digits={digits}
              fs={fs}
              color={color}
              id={`tc-${u.id}`}
            />
          </g>,
        );
      }
    }
    const freq = fast ? 3 : 1.7;
    offs.forEach((o, i) => {
      const jitter = r();
      if (u.swarm) return;
      if (i >= Math.ceil(n)) return;
      // 소수 부분: 쓰러지는 중(0 → 1)
      const fall = i === Math.floor(n) ? 1 - (n - i) : 0;
      // 물 위에 선 사람은 부대 가운데 쪽 땅으로(대군과 같게 - 배는 예외)
      const ground: LonLat = [pos.at[0] + o[0], pos.at[1] + o[1]];
      const p = at(
        water && u.kind !== "plane"
          ? (u.kind === "ship" ? toWater : toLand)(
              water,
              ground,
              pos.at,
              u.spread ?? 0.06 * Math.sqrt(N),
            )
          : ground,
      );
      if (p.x < -200 || p.x > f.w + 200 || p.y < -200 || p.y > f.h + 200)
        return;
      const s = p.k * base * (u.size ?? 1);
      const phase = time * Math.PI * 2 * freq + jitter * Math.PI * 2;
      const cav = u.kind === "cavalry" || u.kind === "horse-archer";
      const horse = horses[Math.floor(jitter * 997) % horses.length];
      sprites.push({
        y: p.y,
        node: (
          <g
            key={`${u.id}-${i}`}
            transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${s.toFixed(4)})`}
            opacity={alpha * (1 - fall * 0.85)}
          >
            <Shadow w={cav ? 30 : 16} />
            <g transform={`rotate(${fall * 80 * face}) scale(${face} 1)`}>
              {fast && <Dust time={time + jitter} amount={1 - fall} />}
              <UnitArt
                kind={u.kind}
                color={color}
                state={fall ? "hold" : pos.state}
                phase={phase}
                horse={horse}
                armor={side?.armor}
                vessel={u.vessel}
                rock={storm}
                aircraft={u.aircraft}
                altitude={u.altitude}
              />
            </g>
          </g>
        ),
      });
    });
  });

  // 수레 원진: 고리 둘레에 수레를 줄지어(이웃 수레와 거의 맞닿게) - 화면에서 가로로 놓인 쪽은 옆모습, 세로로 놓인 쪽은 앞뒤 모습
  scene.forts?.forEach((fo, i) => {
    const alpha = alphaAt(fo, t);
    if (!alpha) return;
    const n = Math.max(6, Math.round(fo.n ?? 28));
    const r = rng(`${i}:${fo.at.join(",")}:wagons`);
    const cos = Math.max(0.2, Math.cos((fo.at[1] * Math.PI) / 180));
    const color = scene.sides?.[fo.side]?.color ?? "#8a7a5c";
    const ringAt = (a: number) =>
      at([
        fo.at[0] + (Math.cos(a) * fo.radius) / cos,
        fo.at[1] + Math.sin(a) * fo.radius,
      ]);
    for (let j = 0; j < n; j++) {
      const a = ((j + (r() - 0.5) * 0.25) / n) * Math.PI * 2;
      const p = ringAt(a);
      if (p.x < -200 || p.x > f.w + 200 || p.y < -200 || p.y > f.h + 200)
        continue;
      const q = ringAt(a + 0.02);
      const tx = q.x - p.x;
      const ty = q.y - p.y;
      // 크기: 대군 실루엣과 같은 키(없으면 부대 기본 크기) - 이웃과 맞닿을 만큼까지는 키운다
      const next = ringAt(a + (Math.PI * 2) / n);
      const gap = Math.hypot(next.x - p.x, next.y - p.y);
      const side = Math.abs(tx) > Math.abs(ty) * 0.9;
      const fig = Number.isFinite(common) ? common * 1.6 : base;
      const s = Math.max(p.k * fig, Math.min(p.k * base * 2.2, gap / 34));
      sprites.push({
        y: p.y,
        node: (
          <g
            key={`w${i}-${j}`}
            transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${(s * (side && tx < 0 ? -1 : 1)).toFixed(4)} ${s.toFixed(4)})`}
            opacity={alpha}
          >
            <WagonArt view={side ? "side" : "end"} color={color} />
          </g>
        ),
      });
    }
  });

  scene.markers?.forEach((m, i) => {
    if (m.kind === "city") return;
    const alpha = alphaAt(m, t);
    if (!alpha) return;
    const p = at(m.at);
    const color = scene.sides?.[m.side ?? ""]?.color ?? "#8a7a5c";
    if (m.kind === "battle") {
      // 접전: 부대 위로 먼지 구름이 퍼진다(나타난 뒤 0.08 동안)
      const grow = Math.min(1, (t - (m.show?.[0] ?? 0)) / 0.08);
      over.push(
        <g
          key={`b${i}`}
          transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${(p.k * 1.4).toFixed(4)})`}
          opacity={alpha}
        >
          <BattleCloud time={time} grow={Math.max(0, grow)} seed={i * 1.3} />
        </g>,
      );
      return;
    }
    if (m.kind === "bombing" || m.kind === "flak") {
      // 폭격·대공포: show 구간에 n개가 고르게 흩어져(씨앗 고정) radius 안에서 터진다. 초는 프레임 기준(같은 t면 같은 그림)
      const [s0, s1] = m.show ?? [0, 1];
      const r = rng(`${i}:${m.kind}:${m.at.join(",")}`);
      const n = m.n ?? (m.kind === "bombing" ? 12 : 16);
      const rad = m.radius ?? (m.kind === "bombing" ? 0.03 : 0.05);
      const cosL = Math.max(0.2, Math.cos((m.at[1] * Math.PI) / 180));
      for (let j = 0; j < n; j++) {
        const tb = s0 + (s1 - s0) * ((j + r()) / n);
        const ang = r() * Math.PI * 2;
        const dist = Math.sqrt(r()) * rad;
        const hop = r();
        const sec = ((t - tb) * frames) / 30;
        if (sec < 0 || sec > (m.kind === "bombing" ? 6 : 3)) continue;
        const q = at([
          m.at[0] + (Math.cos(ang) * dist) / cosL,
          m.at[1] + Math.sin(ang) * dist,
        ]);
        const sc = q.k * base * (m.size ?? 1);
        const alt = (m.altitude ?? 110) * (0.75 + 0.5 * hop);
        over.push(
          m.kind === "bombing" ? (
            <g
              key={`bo${i}-${j}`}
              transform={`translate(${q.x.toFixed(2)} ${q.y.toFixed(2)}) scale(${sc.toFixed(4)})`}
            >
              <Bomb sec={sec} drop={alt} seed={j} />
            </g>
          ) : (
            <g
              key={`fl${i}-${j}`}
              transform={`translate(${q.x.toFixed(2)} ${(q.y - alt * sc).toFixed(2)}) scale(${sc.toFixed(4)})`}
            >
              <Flak sec={sec} />
            </g>
          ),
        );
      }
      return;
    }
    if (m.kind === "face") {
      const href = m.char ? faces[faceKey(m.char, m.mood)] : undefined;
      const k = medalScale(m.show, t);
      if (!href || k <= 0.001) return;
      const ms = medalPx(f.h, m.size ?? 1, p.k) * k;
      const bob = Math.sin(time * 1.3 + i) * 1.2;
      over.push(
        <g
          key={`f${i}`}
          transform={`translate(${p.x.toFixed(2)} ${(p.y + bob).toFixed(2)}) scale(${ms.toFixed(4)})`}
          opacity={alpha * Math.min(1, k * 1.5)}
        >
          <FaceMedal href={href} color={color} id={`fm-${i}`} />
        </g>,
      );
      return;
    }
    if (m.kind === "siege" || m.kind === "sack") {
      // 포위된 성벽 도시: burn = 불길이 커졌다(앞 25%) 유지하다 끝나면 0.1 동안 잦아들어 잔불, 연기는 불길 따라 오르고 끝난 뒤
      // 옅게 0.25 동안 남는다. fall = 앞 40% 금, 나머지 무너짐 → 폐허. 크기는 부대 기본 크기의 1.4배 × size
      const [b0, b1] = m.burn ?? [2, 3];
      const bd = Math.max(1e-6, b1 - b0);
      const rise = smoothstep(b0, b0 + bd * 0.25, t);
      const after = t > b1 ? 1 - smoothstep(b1, b1 + 0.1, t) * 0.85 : 1;
      const burn = rise * after;
      const charred = smoothstep(b0, b0 + bd * 0.6, t);
      const smoke =
        Math.max(
          burn,
          t > b1 ? 0.35 * (1 - smoothstep(b1, b1 + 0.25, t)) + 0.12 : 0,
        ) * rise;
      const [f0, f1] = m.fall ?? [2, 3];
      const fd = Math.max(1e-6, f1 - f0);
      const crack = smoothstep(f0, f0 + fd * 0.4, t);
      const fall = smoothstep(f0 + fd * 0.4, f1, t);
      // 크기: 땅 위 반지름 radius(도, 기본 0.03 ≈ 3km)가 화면에서 차지하는 폭에 맞추되(확대하면 땅과 같이 커진다 - 둘러싼
      // 고리 대군과 맞게), 멀리서는 부대 기본 크기의 1.4배 × size보다 작아지지 않게
      const rad = m.radius ?? 0.03;
      const cosL = Math.max(0.2, Math.cos((m.at[1] * Math.PI) / 180));
      const pl = at([m.at[0] - rad / cosL, m.at[1]]);
      const pr = at([m.at[0] + rad / cosL, m.at[1]]);
      const sc = Math.max(
        p.k * base * 1.4 * (m.size ?? 1),
        Math.hypot(pr.x - pl.x, pr.y - pl.y) / 100,
      );
      const tr = `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${sc.toFixed(4)})`;
      sprites.push({
        y: p.y,
        node: (
          <g key={`s${i}`} transform={tr} opacity={alpha}>
            <CityArt
              color={color}
              crack={crack}
              fall={fall}
              burn={burn}
              charred={charred}
              time={time}
              seed={`${i}:${m.at.join(",")}`}
            />
          </g>
        ),
      });
      if (smoke > 0.01)
        over.push(
          <g key={`sm${i}`} transform={tr} opacity={alpha}>
            <SmokeColumn time={time} amount={smoke} seed={i} />
          </g>,
        );
      return;
    }
    // 나타날 때 살짝 커지며
    const pop = 0.85 + 0.15 * Math.min(1, alpha * 1.2);
    sprites.push({
      y: p.y,
      node: (
        <g
          key={`m${i}`}
          transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${(p.k * base * pop).toFixed(4)})`}
          opacity={alpha}
        >
          <Shadow w={18} />
          <MarkerArt kind="camp" color={color} />
        </g>
      ),
    });
  });

  // 화살표: 부대 위에, 화면 기준 같은 굵기, 늘 촉이 있게(땅 위 경로를 화면으로 옮겨 그린다)
  const toPx = (x: number, y: number) =>
    screen(((x - v.x) / v.w) * size.w, ((y - v.y) / v.h) * size.h);
  scene.arrows?.forEach((a, i) => {
    const alpha = alphaAt(a, t, a.grow?.[0] ?? 0);
    const g = growAt(a.grow, t);
    if (!alpha || g <= 0) return;
    const line = cut(smooth(projectLine(a.path, shift, v), 24), g).map(
      ([x, y]) => {
        const q = toPx(x, y);
        return [q.x, q.y] as [number, number];
      },
    );
    if (line.length < 2) return;
    const retreat = a.style === "retreat";
    const w = (a.width ?? 1) * (retreat ? 7 : 11);
    const [x1, y1] = line[line.length - 1];
    // 촉 방향: 끝에서 화면 거리 w 이상 떨어진 앞 점으로
    let back = line[0];
    for (let j = line.length - 2; j >= 0; j--)
      if (Math.hypot(x1 - line[j][0], y1 - line[j][1]) >= w * 1.5) {
        back = line[j];
        break;
      }
    const len = Math.hypot(x1 - back[0], y1 - back[1]) || 1;
    const ux = (x1 - back[0]) / len;
    const uy = (y1 - back[1]) / len;
    const hl = w * 2.4;
    const hw = w * 1.7;
    // 몸통은 촉 밑동까지만(촉이 늘 보이게)
    const body = cut(
      line,
      Math.max(0.02, 1 - (hl * 0.7) / Math.max(hl, pathLen(line))),
    );
    const bx = x1 - ux * hl;
    const by = y1 - uy * hl;
    const head = `M${x1} ${y1}L${bx - uy * hw} ${by + ux * hw}L${bx + uy * hw} ${by - ux * hw}Z`;
    // 물러남(retreat) 점선: 둥근 끝이 칠한 토막 양쪽으로 굵기 절반씩 늘어나므로 그만큼 빼고 띄운다 - 그대로 두면 틈이 거의 메워져
    // 마디진 구슬처럼 보였다(RMW). 보이는 토막 약 2.4w·틈 약 1.4w(먹 테두리는 굵어 틈이 5px 좁다)
    const dash = retreat ? `${w * 1.4} ${w * 2.4}` : undefined;
    over.push(
      <g
        key={`r${i}`}
        opacity={alpha * 0.85}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={d(body)}
          stroke={INK}
          strokeWidth={w + 5}
          strokeDasharray={dash}
        />
        <path
          d={d(body)}
          stroke={scene.sides?.[a.side]?.color ?? "#8a7a5c"}
          strokeWidth={w}
          strokeDasharray={dash}
        />
        <path
          d={head}
          fill={scene.sides?.[a.side]?.color ?? "#8a7a5c"}
          stroke={INK}
          strokeWidth={3}
        />
      </g>,
    );
  });

  sprites.sort((a, b) => a.y - b.y);
  // 연도 숫자: 해마다 끝 무렵(마지막 35%)에 한 칸 똑딱 굴러간다(이어서 구르면 프레임마다 반쯤 걸린 숫자가 보였다)
  const yearRaw = yearFlowAt(scene, t).value;
  const yearShown = (() => {
    const base = Math.floor(yearRaw);
    const k = Math.min(1, Math.max(0, (yearRaw - base - 0.65) / 0.35));
    return base + k * k * (3 - 2 * k);
  })();
  const yearDigits = Math.max(
    1,
    ...[scene.year ?? 0, ...(scene.years ?? []).map((y) => y.year)].map(
      (y) => String(Math.abs(Math.round(y))).length,
    ),
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  // 대군은 그리는 중(같은 커밋)에 canvas로 - seek가 기다리는 두 프레임 안에 끝난다
  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = devicePixelRatio || 1;
    if (c.width !== Math.round(f.w * dpr)) c.width = Math.round(f.w * dpr);
    if (c.height !== Math.round(f.h * dpr)) c.height = Math.round(f.h * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, f.w, f.h);
    drawCrowd(g, crowd, shades);
  });
  return (
    <>
      <canvas
        ref={canvas}
        aria-hidden
        data-scene-crowd
        style={{
          width: f.w,
          height: f.h,
          zIndex: 9,
          transform: "translateZ(1px)",
        }}
        className="pointer-events-none absolute inset-0 block"
      />
      <svg
        aria-hidden
        data-scene-sprites
        width={f.w}
        height={f.h}
        viewBox={`0 0 ${f.w} ${f.h}`}
        // 눕힌 판(잘라 내지 않음)의 가까운 쪽이 3D로 앞에 나와 이 층을 덮었다 - 앞으로 띄운다
        style={{ zIndex: 10, transform: "translateZ(1px)" }}
        className="pointer-events-none absolute inset-0 block"
      >
        <defs>
          <filter id="scene-ink" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={0.08}
              numOctaves={2}
              seed={3}
            />
            <feDisplacementMap in="SourceGraphic" scale={1.6} />
          </filter>
          <filter id="scene-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={7} />
          </filter>
        </defs>
        {/* 먼 쪽 안개(기울였을 때 지평선 쪽이 흐려져 깊이가 보이게) */}
        {geo.tilt > 0 && (
          <>
            <linearGradient id="scene-haze" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                stopColor="var(--map-sky)"
                stopOpacity={Math.min(0.85, geo.tilt / 55)}
              />
              <stop offset="0.45" stopColor="var(--map-sky)" stopOpacity={0} />
            </linearGradient>
            <rect width={f.w} height={f.h} fill="url(#scene-haze)" />
          </>
        )}
        <g filter="url(#scene-ink)">{sprites.map((s) => s.node)}</g>
        <g filter="url(#scene-ink)">{over}</g>
        {scene.showYear && (
          // 연도: 흐르는 장면(years flow)에서는 국경이 녹아 넘어갈 때 함께 굴러간다(계기판, 쉼표 없음)
          <g transform={`translate(40 ${f.h - 40})`}>
            <TroopCount
              value={Math.abs(yearShown)}
              step={1}
              digits={yearDigits}
              fs={64}
              id="year"
              commas={false}
            />
          </g>
        )}
      </svg>
    </>
  );
}

/** WorldMap이 세 자리에 둔다: 지도 칸 맨 아래 WebGL 판(where="gl"), 판 안(where="plane"), 지도 칸 위(where="screen") */
export function SceneLayer({
  where,
  geo,
  host,
  gl,
}: {
  where: "gl" | "plane" | "screen";
  geo: SceneGeo;
  host: { current: SceneHost | null };
  gl?: {
    getView: { current: () => GlView | null };
    polities: Polity[];
    land: FeatureCollection | Feature;
  };
}) {
  const { scene, t, frames, terrain } = useScene();
  if (where === "gl")
    return gl ? (
      <SceneGl getView={gl.getView} polities={gl.polities} land={gl.land} />
    ) : null;
  if (where === "screen")
    return (
      <ScreenApi
        host={host}
        scene={scene}
        t={t}
        frames={frames}
        geo={geo}
        terrain={terrain}
      />
    );
  // 판 층(칠한 곳·선·도시 점·진지 땅)은 WebGL 장면 판이 그린다(scenePlane.ts)
  return null;
}

function ScreenApi({
  host,
  scene,
  t,
  frames,
  geo,
  terrain,
}: {
  host: { current: SceneHost | null };
  scene: Scene | null;
  t: number;
  frames: number;
  geo: SceneGeo;
  terrain: Terrain | null;
}) {
  useSceneApi(host);
  return scene ? (
    <ScreenLayer
      scene={scene}
      t={t}
      frames={frames}
      geo={geo}
      terrain={terrain}
    />
  ) : null;
}
