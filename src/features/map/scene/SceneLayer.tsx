"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { swarmAt } from "./sceneSwarm";
import { drawCrowd, type Figure, type GroupShade } from "./sceneCrowd";
import { create } from "zustand";
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
  type LonLat,
  type Scene,
  type SceneJson,
  type Terrain,
} from "./sceneData";
import {
  BattleCloud,
  Dust,
  Flag,
  INK,
  MarkerArt,
  Shadow,
  UnitArt,
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

const useScene = create<{
  scene: Scene | null;
  t: number;
  frames: number;
  terrain: Terrain | null;
}>(() => ({ scene: null, t: 0, frames: 300, terrain: null }));

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
/* 지형이 있으면 바다·땅·50m 해안선은 땅 층(ground)이 그리고, 국경 svg는 나라 색만 곱하기로 얹는다(지형이 비치게) */
html[data-scene-terrain] [data-map-frame] svg[role="img"] { mix-blend-mode: multiply; }
html[data-scene-terrain] [data-map-frame] svg[role="img"] > rect,
html[data-scene-terrain] [data-map-frame] svg[role="img"] path[fill="var(--map-land)"],
html[data-scene-terrain] [data-map-frame] svg[role="img"] path[fill="none"][stroke="var(--map-border)"] { display: none; }
html[data-scene-terrain] { --map-region-opacity: 0.26; }
/* 나라 경계선은 옅게(지도 전체에 강인지 경계인지 모를 진회색 선이 많았다) */
html[data-scene-terrain] [data-map-frame] svg[role="img"] [data-polity] { stroke-opacity: 0.22; }
/* 나라 색은 50m 해안선 대신 지형의 10m 해안선으로 자른다 - 50m와 10m 사이가 옅은 띠로 남았다 */
html[data-scene-terrain] [data-map-frame] svg[role="img"] g[clip-path] { clip-path: url(#ground-land-raw) !important; }
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
      while (!h.ready()) {
        if (performance.now() - start > 20000)
          throw new Error(`장면 ${t}: 20초 안에 그리지 못함`);
        await wait(16);
      }
      await frame();
      await frame();
    };
    window.__scene = {
      async load(json, opts = {}) {
        const scene = resolveScene(json, opts.marks);
        const terrain = scene.terrain && opts.terrain ? opts.terrain : null;
        if (terrain) {
          html.dataset.sceneTerrain = "";
          // 그림을 미리 받아 둔다(첫 프레임부터 지형이 다 보이게)
          await Promise.all(
            [terrain.color, terrain.shade].map(
              (src) =>
                new Promise((res, rej) => {
                  const img = new Image();
                  img.onload = () => img.decode().then(res, res);
                  img.onerror = rej;
                  img.src = src;
                }),
            ),
          );
        } else delete html.dataset.sceneTerrain;
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
        useScene.setState({ scene, frames: opts.frames ?? 300, t: 0, terrain });
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

/** 꺾은선 위 일정 간격(units) 점들과 그 자리의 방향(단위 벡터) */
function along(line: [number, number][], step: number) {
  const out: { p: [number, number]; n: [number, number] }[] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (!len) continue;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    for (let s = carry; s < len; s += step)
      out.push({ p: [ax + ux * s, ay + uy * s], n: [ux, uy] });
    carry = (carry - len) % step;
    if (carry < 0) carry += step;
  }
  return out;
}

function PlaneLayer({
  scene,
  t,
  geo,
}: {
  scene: Scene;
  t: number;
  geo: SceneGeo;
}) {
  const { v, size } = geo;
  const unit = v.h / size.h; // 화면 CSS 1px = 지도 몇 단위
  const shift = (-geo.lon * MAP_WIDTH) / 360;
  const color = (side?: string) =>
    (side && scene.sides?.[side]?.color) || "#8a7a5c";
  const items: ReactNode[] = [];

  scene.areas?.forEach((a, i) => {
    const alpha = alphaAt(a, t);
    if (!alpha) return;
    items.push(
      <path
        key={`a${i}`}
        d={d(projectLine(a.polygon, shift, v), true)}
        fill={color(a.side)}
        fillOpacity={(a.opacity ?? 0.25) * alpha}
        stroke={INK}
        strokeOpacity={0.7 * alpha}
        strokeWidth={2 * unit}
        strokeDasharray={`${6 * unit} ${5 * unit}`}
      />,
    );
  });

  scene.lines?.forEach((l, i) => {
    const alpha = alphaAt(l, t);
    if (!alpha) return;
    const line = cut(smooth(projectLine(l.path, shift, v)), growAt(l.grow, t));
    if (line.length < 2) return;
    const key = `l${i}`;
    if (l.style === "river") {
      // 물과 같은 바랜 청회색, 하류(경로 끝)로 갈수록 굵게 - 마디마다 굵기를 조금씩 늘린다
      const parts = 8;
      const step = Math.max(1, Math.floor(line.length / parts));
      const segs: ReactNode[] = [];
      for (let j = 0; j < line.length - 1; j += step) {
        const piece = line.slice(j, Math.min(line.length, j + step + 1));
        const k = 0.45 + 0.55 * (j / Math.max(1, line.length - 1));
        segs.push(
          <g key={j}>
            <path
              d={d(piece)}
              stroke="#41566a"
              strokeWidth={7 * k * unit}
              strokeOpacity={0.5}
            />
            <path d={d(piece)} stroke="#6f8899" strokeWidth={3.6 * k * unit} />
          </g>,
        );
      }
      items.push(
        <g
          key={key}
          opacity={alpha}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {segs}
        </g>,
      );
    } else if (l.style === "line") {
      items.push(
        <path
          key={key}
          d={d(line)}
          fill="none"
          stroke={INK}
          strokeWidth={2.5 * unit}
          opacity={alpha}
          strokeLinecap="round"
        />,
      );
    } else if (l.style === "front") {
      // 톱니 전선: 선 왼쪽(진행 방향 기준)으로 진영 색 이빨
      const teeth = along(line, 20 * unit).map(({ p, n }, j) => {
        const [x, y] = p;
        const nx = n[1];
        const ny = -n[0];
        const h = 9 * unit;
        const w = 6 * unit;
        return (
          <path
            key={j}
            d={`M${x - n[0] * w} ${y - n[1] * w}L${x + nx * h} ${y + ny * h}L${x + n[0] * w} ${y + n[1] * w}Z`}
            fill={color(l.side)}
            stroke={INK}
            strokeWidth={2 * unit}
            strokeLinejoin="round"
          />
        );
      });
      items.push(
        <g key={key} opacity={alpha}>
          {teeth}
          <path
            d={d(line)}
            fill="none"
            stroke={INK}
            strokeWidth={3.5 * unit}
            strokeLinecap="round"
          />
        </g>,
      );
    } else {
      // 참호: 지그재그 흙선
      const zig = along(line, 7 * unit).map(({ p, n }, j) => {
        const k = (j % 2 ? 1 : -1) * 4 * unit;
        return [p[0] + n[1] * k, p[1] - n[0] * k] as [number, number];
      });
      items.push(
        <g
          key={key}
          opacity={alpha}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d={d(zig)} stroke={INK} strokeWidth={6 * unit} />
          <path d={d(zig)} stroke="#7a5a3a" strokeWidth={3 * unit} />
        </g>,
      );
    }
  });

  scene.markers?.forEach((m, i) => {
    if (m.kind !== "city") return;
    const alpha = alphaAt(m, t);
    if (!alpha) return;
    const [x, y] = project(m.at);
    items.push(
      <circle
        key={`c${i}`}
        cx={nearX(x, shift, v)}
        cy={y}
        r={6 * unit}
        fill="#efe3c8"
        stroke={INK}
        strokeWidth={3 * unit}
        opacity={alpha}
      />,
    );
  });

  return (
    <svg
      aria-hidden
      viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 block h-full w-full"
    >
      <defs>
        {/* 먹선이 손으로 그린 듯 살짝 흔들리게(씨앗 고정) */}
        <filter id="scene-ink-plane" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.05 / (unit / 1)}
            numOctaves={2}
            seed={3}
          />
          <feDisplacementMap in="SourceGraphic" scale={2.5 * unit} />
        </filter>
      </defs>
      <g filter="url(#scene-ink-plane)">{items}</g>
    </svg>
  );
}

/**
 * 땅 층(지형): 국경 svg 아래. 땅 색(토지 피복) + 산 음영(overlay) + 10m 해안선·호수·강.
 * 지형 지역(bbox) 밖은 바랜 땅 색 하나(먼 쪽 - 안개가 가린다)
 */
function GroundLayer({
  scene,
  terrain,
  geo,
}: {
  scene: Scene;
  terrain: Terrain;
  geo: SceneGeo;
}) {
  const { v, size } = geo;
  const unit = v.h / size.h;
  const shift = (-geo.lon * MAP_WIDTH) / 360;
  const [W, S, E, N] = terrain.bbox;
  const [x0, y0] = project([W, N]);
  const [x1, y1] = project([E, S]);
  const X0 = nearX(x0, shift, v);
  const X1 = X0 + (x1 - x0);
  const rings = (list: LonLat[][]) =>
    list.map((r) => d(projectLine(r, shift, v), true)).join("");
  const land = rings(terrain.land);
  const water = `M${X0} ${y0}H${X1}V${y1}H${X0}Z${land}`;
  const film = scene.theme === "film";
  return (
    <svg
      aria-hidden
      viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 block h-full w-full"
    >
      <defs>
        <clipPath id="ground-land">
          <path d={land} clipRule="evenodd" />
        </clipPath>
        {/* 국경 svg의 나라 색을 10m 해안선으로 자르는 데 쓴다(그쪽 좌표는 복사본 안 - 경도 0 투영 그대로) */}
        <clipPath id="ground-land-raw">
          <path
            d={terrain.land.map((r) => d(r.map(project), true)).join("")}
            clipRule="evenodd"
          />
        </clipPath>
      </defs>
      <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="var(--map-land)" />
      <image
        href={terrain.color}
        x={X0}
        y={y0}
        width={X1 - X0}
        height={y1 - y0}
        preserveAspectRatio="none"
        clipPath="url(#ground-land)"
        style={{
          filter: film
            ? // 초원·숲·습지 색이 살아 있게(너무 바래면 단색 양피지처럼 보였다)
              "sepia(0.2) saturate(0.82) brightness(0.9) contrast(1.15)"
            : undefined,
        }}
      />
      {/* 물: 지형 지역 사각형에서 땅을 뺀 곳 + 호수 */}
      <path d={water} fillRule="evenodd" fill="var(--map-ocean)" />
      <path
        d={rings(terrain.lakes)}
        fillRule="evenodd"
        fill="var(--map-ocean)"
      />
      {/* 산 음영(평지 = 회색 128 - overlay로 섞으면 평지는 그대로) */}
      <image
        href={terrain.shade}
        x={X0}
        y={y0}
        width={X1 - X0}
        height={y1 - y0}
        preserveAspectRatio="none"
        style={{ mixBlendMode: "overlay", opacity: scene.relief ?? 0.8 }}
      />
      {/* 해안: 물 쪽 옅은 띠 + 가는 먹선 */}
      <path
        d={land}
        fill="none"
        stroke="#9fb1bb"
        strokeOpacity={0.45}
        strokeWidth={6 * unit}
        strokeLinejoin="round"
      />
      <path
        d={land}
        fill="none"
        stroke="#3d4a52"
        strokeOpacity={0.7}
        strokeWidth={1.2 * unit}
        strokeLinejoin="round"
      />
      <path
        d={rings(terrain.lakes)}
        fill="none"
        stroke="#3d4a52"
        strokeOpacity={0.5}
        strokeWidth={1 * unit}
      />
      {/* 강: 물색 계열, 큰 강일수록 굵고 진하게 - 작은 강은 옅게(화면에서 1px 아래로 가늘어지면 거의 안 보이게) */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {terrain.rivers.map((r, i) => {
          const px = 0.8 + r.w * 1.8;
          return (
            <path
              key={i}
              d={d(projectLine(r.l, shift, v))}
              stroke="#5f7486"
              strokeOpacity={
                Math.min(0.95, 0.25 + 0.35 * r.w) * Math.min(1, px / 1.6)
              }
              strokeWidth={px * unit}
            />
          );
        })}
      </g>
    </svg>
  );
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
}: {
  scene: Scene;
  t: number;
  frames: number;
  geo: SceneGeo;
}) {
  const { v, size, frame: f } = geo;
  const shift = (-geo.lon * MAP_WIDTH) / 360;
  const screen = toScreen(geo);
  /** 경위도 → 화면 */
  const at = (p: LonLat) => {
    const [x, y] = project(p);
    const X = nearX(x, shift, v);
    return screen(((X - v.x) / v.w) * size.w, ((y - v.y) / v.h) * size.h);
  };
  const time = (t * frames) / 30;
  // 부대 그림 크기: 기본은 키 약 22px@1280(영상 44px) - 크면 보드게임 말처럼 보여 작게 많이(RMW 피드백)
  const base = (scene.unitScale ?? scene.unitSize ?? 1) * 0.45;
  /** 접전 먼지·화살표처럼 부대보다 위에 그릴 것 */
  const over: ReactNode[] = [];
  const sprites: { y: number; node: ReactNode }[] = [];

  /** 대군 실루엣(canvas에 그린다 - svg로 수천 개는 너무 무거움, 그리기는 sceneCrowd) */
  const crowd: Figure[] = [];
  const shades = new Map<number, GroupShade>();
  const swarms = (scene.units ?? [])
    .map((u, group) => ({ u, group }))
    .filter(({ u }) => u.swarm && u.path.length && alphaAt(u, t, u.path[0].t))
    .map(({ u, group }) => {
      const pos = unitAt(u.path, t);
      const cols = Math.max(1, Math.round(Math.sqrt(u.swarm!.n * 3)));
      return {
        u,
        group,
        pos,
        R: u.swarm!.radius,
        /** 무리 안 이웃 간격(도) */
        gap: (2 * u.swarm!.radius) / Math.max(1, cols - 1),
        shift: [0, 0] as [number, number],
      };
    });
  // 다른 진영 무리끼리 겹치면 서로 밀어 틈을 둔다(실루엣 4개 폭) - 돌격 중(접전)이면 앞줄만 맞닿게 더 가까이.
  // 한 무리가 다른 무리를 덮어 진영 경계가 안 보였다(RMW 피드백). t만으로 정해지는 계산(앞 프레임과 무관)
  for (let a = 0; a < swarms.length; a++)
    for (let b = a + 1; b < swarms.length; b++) {
      const A = swarms[a];
      const B = swarms[b];
      if (A.u.side === B.u.side) continue;
      const cos = Math.max(0.2, Math.cos((A.pos.at[1] * Math.PI) / 180));
      const dx = (B.pos.at[0] - A.pos.at[0]) * cos;
      const dy = B.pos.at[1] - A.pos.at[1];
      const dist = Math.hypot(dx, dy) || 1e-6;
      const contact = A.pos.state === "charge" || B.pos.state === "charge";
      const want = contact
        ? (A.R + B.R) * 0.45
        : (A.R + B.R) * 0.75 + 4 * Math.max(A.gap, B.gap);
      if (dist >= want) continue;
      const push = (want - dist) / 2;
      A.shift[0] -= ((dx / dist) * push) / cos;
      A.shift[1] -= (dy / dist) * push;
      B.shift[0] += ((dx / dist) * push) / cos;
      B.shift[1] += (dy / dist) * push;
    }
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
  if (Number.isFinite(common)) common = Math.max(common, floor);
  for (const { u, group, R, shift } of swarms) {
    const alpha = alphaAt(u, t, u.path[0].t);
    const side = scene.sides?.[u.side];
    const horses = side?.horse
      ? Array.isArray(side.horse)
        ? side.horse
        : [side.horse]
      : ["#8b5e3c"];
    const men = swarmAt(u.id, u.path, u.swarm!, u.count, t);
    // 무리 바닥 그림자: 살아 있는 사람들의 가운데·퍼짐
    let sx = 0;
    let sy = 0;
    let live = 0;
    men.forEach((m, i) => {
      if (m.fallen >= 1) return;
      const p = at([m.at[0] + shift[0], m.at[1] + shift[1]]);
      if (!m.fallen) {
        sx += p.x;
        sy += p.y;
        live++;
      }
      if (p.x < -60 || p.x > f.w + 60 || p.y < -60 || p.y > f.h + 60) return;
      const q = at([
        m.at[0] + shift[0] + m.dir[0] * 0.01,
        m.at[1] + shift[1] + m.dir[1] * 0.01,
      ]);
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
      });
    });
    if (live) {
      const c = at(unitAt(u.path, t).at);
      const e = at([
        unitAt(u.path, t).at[0] +
          R /
            Math.max(0.2, Math.cos((unitAt(u.path, t).at[1] * Math.PI) / 180)),
        unitAt(u.path, t).at[1],
      ]);
      const rx = Math.hypot(e.x - c.x, e.y - c.y) * 1.15;
      shades.set(group, {
        x: sx / live,
        y: sy / live,
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
      const len = Math.hypot(pos.dir[0], pos.dir[1]) || 1;
      const reach = (u.spread ?? 0.06 * Math.sqrt(N)) * 0.8;
      const fp = at([
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
    const freq = fast ? 3 : 1.7;
    offs.forEach((o, i) => {
      const jitter = r();
      if (u.swarm) return;
      if (i >= Math.ceil(n)) return;
      // 소수 부분: 쓰러지는 중(0 → 1)
      const fall = i === Math.floor(n) ? 1 - (n - i) : 0;
      const p = at([pos.at[0] + o[0], pos.at[1] + o[1]]);
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
              />
            </g>
          </g>
        ),
      });
    });
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
    const dash = retreat ? `${w * 1.6} ${w * 1.1}` : undefined;
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
  const year = yearAt(scene, t);
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
          <text
            x={40}
            y={f.h - 40}
            fontSize={64}
            fontWeight={800}
            fontFamily="Georgia, 'Noto Serif', serif"
            fill="#efe3c8"
            stroke={INK}
            strokeWidth={5}
            paintOrder="stroke"
          >
            {year}
          </text>
        )}
      </svg>
    </>
  );
}

/** WorldMap이 두 자리에 둔다: 판 안(where="plane")과 지도 칸 위(where="screen") */
export function SceneLayer({
  where,
  geo,
  host,
}: {
  where: "ground" | "plane" | "screen";
  geo: SceneGeo;
  host: { current: SceneHost | null };
}) {
  const { scene, t, frames, terrain } = useScene();
  if (where === "ground")
    return scene && terrain ? (
      <GroundLayer scene={scene} terrain={terrain} geo={geo} />
    ) : null;
  if (where === "screen")
    return (
      <ScreenApi host={host} scene={scene} t={t} frames={frames} geo={geo} />
    );
  return scene ? <PlaneLayer scene={scene} t={t} geo={geo} /> : null;
}

function ScreenApi({
  host,
  scene,
  t,
  frames,
  geo,
}: {
  host: { current: SceneHost | null };
  scene: Scene | null;
  t: number;
  frames: number;
  geo: SceneGeo;
}) {
  useSceneApi(host);
  return scene ? (
    <ScreenLayer scene={scene} t={t} frames={frames} geo={geo} />
  ) : null;
}
