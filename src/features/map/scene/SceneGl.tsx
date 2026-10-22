"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { GlView } from "@/components/map/gl/renderer";
import type { Ring } from "@/components/map/gl/polygons";
import { projectLines, projectPolygon } from "@/components/map/gl/polygons";
import {
  cssColor,
  glProjection,
  landPieces,
  shapeAll,
} from "@/components/map/gl/shapes";
import { polityColor } from "@/components/map/polityColor";
import type { Polity } from "../borders";
import { yearAt, type LonLat, type Scene, type Terrain } from "./sceneData";
import { useScene } from "./sceneStore";
import { loadHeight } from "./sceneHeight";
import { planeOps } from "./scenePlane";
import {
  GRADE,
  PALETTE,
  SceneRenderer,
  type SceneLook,
  type SceneTerrain,
} from "./sceneRenderer";

/**
 * 영상 장면 WebGL 판(지도 칸 맨 아래 한 장): 땅·바다·지형·나라 색·해안·강 + 필름 마감(sceneRenderer.ts).
 * 국경 svg·지형 svg 대신 그린다(html data-scene-gl). seek는 다 받았는지(ready) 확인한 뒤 draw로 그 시각을 한 장 그린다
 */

/**
 * 지형 고리(경위도, 지형 상자 안 - 날짜변경선을 넘지 않음) → 지도 좌표: 점마다 그대로 투영(예전 지형 svg와 같게).
 * d3 선 투영은 긴 직선(상자 가장자리)을 대원으로 휘게 그려 짝홀 채우기가 어긋났다
 */
function ringsOf(list: LonLat[][]): Ring[] {
  return list.map((r) => r.map((p) => glProjection(p) as [number, number]));
}
/**
 * 해안선 도형 → 지도 좌표 고리들(d3 다각형 투영 - 날짜변경선에서 잘라 닫는다). 선으로 투영하면 유라시아 고리가 추코트카에서
 * 끊긴 열린 선이 되어 부채꼴이 대륙을 가로지르는 줄로 닫혀 땅·바다가 뒤집혔다
 */
const land50 = new WeakMap<object, Ring[]>();
function landRings(land: FeatureCollection | Feature): Ring[] {
  let out = land50.get(land);
  if (!out) {
    out = landPieces(land).flatMap((f) =>
      (f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates
      ).flatMap((poly) => projectPolygon(glProjection, poly)),
    );
    land50.set(land, out);
  }
  return out;
}

/** CSS sepia(a) saturate(s) brightness(b)(Filter Effects 규격 행렬) - film 테마의 국경 svg 필터와 같은 색 */
function filmFilter(c: number[], a = 0.3, s = 0.65, b = 0.92): number[] {
  const k = 1 - a;
  const [r, g, bl] = c;
  let x = [
    (0.393 + 0.607 * k) * r + (0.769 - 0.769 * k) * g + (0.189 - 0.189 * k) * bl,
    (0.349 - 0.349 * k) * r + (0.686 + 0.314 * k) * g + (0.168 - 0.168 * k) * bl,
    (0.272 - 0.272 * k) * r + (0.534 - 0.534 * k) * g + (0.131 + 0.869 * k) * bl,
  ];
  const [R, G, B] = x;
  x = [
    (0.213 + 0.787 * s) * R + (0.715 - 0.715 * s) * G + (0.072 - 0.072 * s) * B,
    (0.213 - 0.213 * s) * R + (0.715 + 0.285 * s) * G + (0.072 - 0.072 * s) * B,
    (0.213 - 0.213 * s) * R + (0.715 - 0.715 * s) * G + (0.072 + 0.928 * s) * B,
  ];
  return [...x.map((v) => Math.min(1, Math.max(0, v)) * b), c[3] ?? 1];
}
const lin = (c: number[]) =>
  c.slice(0, 3).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
const withAlpha = (c: number[], a: number) => [c[0], c[1], c[2], a];

/** 장면·테마로 판 모양 값을 정한다(html의 data-scene-theme가 붙은 뒤 CSS 변수를 읽는다) */
function lookOf(scene: Scene, terrain: boolean): SceneLook {
  const html = document.documentElement;
  const css = (v: string) => cssColor(`var(${v})`, html);
  const film = scene.theme === "film";
  const f = (c: number[]) => (film ? filmFilter(c) : c);
  const pal = { ...PALETTE, ...scene.palette };
  return {
    sky: css("--map-sky"),
    // 지형 장면의 물은 지형 svg 때와 같이 필터 없이(예전 판과 같은 바다), 아니면 국경 svg처럼 필터
    ocean: terrain ? css("--map-ocean") : f(css("--map-ocean")),
    land: terrain ? css("--map-land") : f(css("--map-land")),
    multiply: terrain,
    polities: scene.borders !== false,
    coastFill: scene.coastFill ?? 30,
    regionOpacity: terrain
      ? 0.26
      : Number(getComputedStyle(html).getPropertyValue("--map-region-opacity")) ||
        0.32,
    border: terrain
      ? { color: withAlpha(f(css("--map-border")), 0.22), width: 0.6 }
      : { color: f(css("--map-border")), width: 0.6 },
    coast: terrain
      ? [
          { color: [0.624, 0.694, 0.733, 0.45], width: 6 },
          { color: [0.239, 0.29, 0.322, 0.7], width: 1.2 },
        ]
      : film
        ? [{ color: withAlpha(f(cssColor("#9fb1bb")), 0.55), width: 5 }]
        : [{ color: css("--map-border"), width: 0.5 }],
    relief: scene.relief ?? 0.8,
    ground: scene.ground ?? "palette",
    palette: [
      pal.steppe,
      pal.steppe_dry,
      pal.green,
      pal.forest,
      pal.rock,
      pal.rock_dark,
      pal.snow,
    ].map((h) => lin(cssColor(h))),
    snowline: scene.snowline ?? 3400,
    greenness: 0.75,
    grade:
      scene.grade === null
        ? null
        : film || scene.grade
          ? { ...GRADE, ...scene.grade }
          : null,
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => img.decode().then(() => res(img), () => res(img));
    img.onerror = rej;
    img.src = src;
  });
}
async function terrainOf(t: Terrain): Promise<SceneTerrain> {
  const [W, S, E, N] = t.bbox;
  const a = glProjection([W, N])!;
  const b = glProjection([E, S])!;
  const [color, shade, height] = await Promise.all([
    loadImage(t.color),
    loadImage(t.shade),
    t.heightmap
      ? loadHeight(t.heightmap, t.height?.offset ?? 0, t.height?.scale ?? 1)
      : Promise.resolve(null),
  ]);
  const river = [0.373, 0.455, 0.525];
  return {
    box: [a[0], a[1], b[0], b[1]],
    color,
    shade,
    height,
    texDeg: [(E - W) / color.naturalWidth, (N - S) / color.naturalHeight],
    land: ringsOf(t.land),
    lakes: ringsOf(t.lakes),
    // 강: 큰 강일수록 굵고 진하게, 가장 작은 강(굵기 0.2~0.4)은 거의 빼고 옅게 - 초원에 가는 물길이 꼬불꼬불 많아 어수선했다(RMW)
    rivers: t.rivers.flatMap((r) => {
      const px = 0.8 + r.w * 1.8;
      const alpha =
        Math.min(0.95, 0.25 + 0.35 * r.w) *
        Math.min(1, px / 1.6) *
        smoothstep(0.25, 0.6, r.w);
      if (alpha < 0.02) return [];
      return projectLines(glProjection, { type: "LineString", coordinates: r.l }).map(
        (line) => ({ line, width: px, color: [...river, alpha] }),
      );
    }),
  };
}

/**
 * 화면 층(SceneLayer의 대군 canvas + 부대·깃발·화살표·먼지·안개 svg)을 기기 px 한 장으로 굽는다 - WebGL 판이 마감 전에 얹는다.
 * svg는 글자로 바꿔 그림으로 그린다(먹선 흔들림 필터도 그대로). CSS 변수는 지금 값으로 바꿔 넣는다
 */
let screenCanvas: HTMLCanvasElement | null = null;
async function composeScreen(): Promise<HTMLCanvasElement | null> {
  const crowd = document.querySelector<HTMLCanvasElement>("canvas[data-scene-crowd]");
  const svg = document.querySelector<SVGSVGElement>("svg[data-scene-sprites]");
  if (!crowd && !svg) return null;
  const dpr = devicePixelRatio || 1;
  const W = crowd?.width ?? Math.round((svg?.clientWidth ?? 0) * dpr);
  const H = crowd?.height ?? Math.round((svg?.clientHeight ?? 0) * dpr);
  if (!W || !H) return null;
  screenCanvas ??= document.createElement("canvas");
  const out = screenCanvas;
  if (out.width !== W) out.width = W;
  if (out.height !== H) out.height = H;
  const g = out.getContext("2d")!;
  g.clearRect(0, 0, W, H);
  if (crowd) g.drawImage(crowd, 0, 0, W, H);
  if (svg && svg.childElementCount) {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(W));
    clone.setAttribute("height", String(H));
    clone.removeAttribute("style");
    clone.removeAttribute("class");
    const html = document.documentElement;
    const sky = getComputedStyle(html).getPropertyValue("--map-sky").trim() || "#3a3f3c";
    const text = new XMLSerializer()
      .serializeToString(clone)
      .replace(/var\(--map-sky\)/g, sky);
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      g.drawImage(img, 0, 0, W, H);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return out;
}

const hiCache = new Map<string, Polity[]>();
const NONE: Polity[] = [];

export function SceneGl({
  getView,
  polities: sitePolities,
  land,
}: {
  getView: { current: () => GlView | null };
  polities: Polity[];
  land: FeatureCollection | Feature;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<SceneRenderer | null>(null);
  const { scene, terrain, t, frames, borders } = useScene();
  // 고정밀 국경(그 해 주소가 있으면 사이트 국경 대신) - 받는 동안은 준비 안 됨
  const year = scene ? yearAt(scene, t) : null;
  const hiUrl = year !== null ? (borders?.[String(year)] ?? null) : null;
  const [hi, setHi] = useState<{ url: string; list: Polity[] } | null>(null);
  useEffect(() => {
    if (!hiUrl) return;
    let dead = false;
    const cached = hiCache.get(hiUrl);
    const done = (list: Polity[]) => !dead && setHi({ url: hiUrl, list });
    if (cached) done(cached);
    else
      fetch(hiUrl)
        .then((r) => r.json())
        .then((fc: { features: Polity[] }) => {
          hiCache.set(hiUrl, fc.features);
          done(fc.features);
        });
    return () => {
      dead = true;
    };
  }, [hiUrl]);
  const polities = hiUrl ? (hi?.url === hiUrl ? hi.list : NONE) : sitePolities;
  /** 다 받은 것(지금 값과 같은 객체면 준비됨) */
  const loaded = useRef<{
    land: object | null;
    polities: object | null;
    terrain: object | null;
    look: object | null;
  }>({ land: null, polities: null, terrain: null, look: null });
  const want = useRef({ land, polities, terrain, scene, hiPending: false });
  useLayoutEffect(() => {
    want.current = {
      land,
      polities,
      terrain,
      scene,
      hiPending: !!hiUrl && hi?.url !== hiUrl,
    };
  });
  const frameNo = Math.round(t * Math.max(0, frames - 1));
  const frameRef = useRef(frameNo);
  useLayoutEffect(() => {
    frameRef.current = frameNo;
  });

  useEffect(() => {
    const el = canvas.current!;
    let r: SceneRenderer;
    try {
      r = new SceneRenderer(el);
    } catch (e) {
      // seek가 20초 기다리지 않고 바로 이유를 알리게
      const msg = `장면 WebGL 판을 만들지 못함: ${e instanceof Error ? e.message : e}`;
      console.error(msg);
      useScene.setState({
        gl: {
          ready: () => {
            throw new Error(msg);
          },
          draw: async () => {},
        },
      });
      return;
    }
    renderer.current = r;
    const html = document.documentElement;
    html.dataset.sceneGl = "";
    let busy: Promise<void> = Promise.resolve();
    const draw = () => {
      // 차례대로(개발 중 보기와 seek가 겹쳐도 한 장씩)
      busy = busy.then(async () => {
        const view = getView.current();
        const { scene, t } = useScene.getState();
        if (!view || !scene) return;
        r.setPlane(planeOps(scene, t, view.v.h / view.size.h));
        r.setOverlay(await composeScreen());
        r.draw(view, frameRef.current);
      });
      return busy;
    };
    useScene.setState({
      gl: {
        ready: () => {
          const w = want.current;
          const l = loaded.current;
          return (
            !w.hiPending &&
            l.land === w.land &&
            l.polities === w.polities &&
            l.look === w.scene &&
            (!w.terrain || l.terrain === w.terrain)
          );
        },
        draw,
      },
    });
    return () => {
      delete html.dataset.sceneGl;
      useScene.setState({ gl: null });
      renderer.current = null;
    };
  }, [getView]);

  // 판 모양 값: 장면(테마·마감·팔레트)과 지형 여부로
  useEffect(() => {
    const r = renderer.current;
    if (!r || !scene) return;
    r.setLook(lookOf(scene, !!terrain));
    loaded.current.look = scene;
  }, [scene, terrain]);

  useEffect(() => {
    renderer.current?.setLand50(landRings(land));
    loaded.current.land = land;
  }, [land]);

  // 나라 삼각형은 나눠 계산(연도가 바뀔 때 화면이 멈추지 않게)
  const film = scene?.theme === "film";
  const border = useMemo(
    () => (scene ? lookOf(scene, !!terrain).border.color : [0, 0, 0, 1]),
    [scene, terrain],
  );
  useEffect(
    () =>
      shapeAll(polities, (list) => {
        renderer.current?.setPolities(
          polities.map((p, i) => {
            const c = cssColor(polityColor(p.properties.w ?? p.properties.n));
            return { shape: list[i], color: film ? filmFilter(c) : c };
          }),
          border,
        );
        loaded.current.polities = polities;
      }),
    [polities, film, border],
  );

  useEffect(() => {
    if (!terrain) {
      renderer.current?.setTerrain(null);
      loaded.current.terrain = null;
      return;
    }
    let dead = false;
    terrainOf(terrain).then((t) => {
      if (dead) return;
      renderer.current?.setTerrain(t);
      if ((globalThis as { __sceneDebug?: string }).__sceneDebug)
        console.error(`지형 올림 ${t.land.length}고리 ${t.rivers.length}강`);
      loaded.current.terrain = terrain;
    });
    return () => {
      dead = true;
    };
  }, [terrain]);

  // 개발 중 보기(seek 밖): 렌더마다 한 번 그린다(화면 층이 그려진 다음 프레임에)
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => void useScene.getState().gl?.draw());
    return () => cancelAnimationFrame(id);
  });

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}
