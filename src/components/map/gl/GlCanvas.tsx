"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";
import { MAP_HEIGHT, MAP_WIDTH, graticule } from "../useMapViewport";
import { MapRenderer, type GlView } from "./renderer";
import { projectLines } from "./polygons";
import {
  cssColor,
  glProjection,
  landPieces,
  readTheme,
  shapeAll,
  shapeAllOffThread,
} from "./shapes";
import { buildAtlas, type AtlasSpec } from "./atlas";

/** 칠할 나라 하나: 도형, CSS 색(var(--x) 가능), 진하기 */
export type GlArea = {
  feature: Feature<Polygon | MultiPolygon>;
  color: string;
  alpha: number;
};
/** 지도 위 직선(지도 좌표, 경도 0 기준) - CSS 색과 진하기 */
export type GlLine = {
  a: [number, number];
  b: [number, number];
  color: string;
  alpha: number;
};

/**
 * WebGL 지도 판(도메인 모름) - 주제 지도·전쟁 지도가 쓴다(본 지도는 핀·나라 고르기가 있는 features/map GlMap).
 * 바다·경위선·땅·나라 색(나라마다 색·진하기)·국경선·해안선·직선(점선 가능)을 그리고, 그 위에 글자 판(AtlasSpec - 점·표식·이름)을 붙인다.
 * 화면은 useGlViewport의 getView를 매 프레임 읽는다. WebGL을 만들 수 없으면 onFail(svg 지도로 바꾸게).
 * 앱을 바꿨다 와서 연결이 끊기면(webglcontextlost) 새로 만들고 자료를 다시 올린다. 무거운 일(삼각형·글자 판)은 6ms씩 나눈다.
 */
export function GlCanvas({
  ref,
  getView,
  land,
  areas,
  borderWidth,
  lines,
  lineStyle,
  sprites,
  zoom,
  onFail,
}: {
  ref: Ref<{ request: () => void } | null>;
  getView: () => GlView | null;
  land: FeatureCollection | Feature;
  areas: GlArea[];
  /** 국경선 굵기(px) */
  borderWidth: number;
  lines: GlLine[];
  /** 직선 굵기·점선(px, [칠한 길이, 빈 길이]) */
  lineStyle: { width: number; dash?: [number, number] };
  sprites: AtlasSpec[];
  /** 글자 판을 만든 배율(확대하는 동안 이름 글자를 배율^0.2로 키운다) */
  zoom: number;
  onFail: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  /** 테마·나라 이름 숨기기·글꼴이 바뀐 횟수(색·글자 판을 다시) */
  const [look, setLook] = useState(0);
  /** WebGL 연결을 새로 만든 횟수(끊겼다 돌아오면) */
  const [gen, setGen] = useState(0);
  const failRef = useRef(onFail);
  useEffect(() => {
    failRef.current = onFail;
  });
  useImperativeHandle(ref, () => ({
    request: () => renderer.current?.request(),
  }));

  useEffect(() => {
    const el = canvas.current!;
    let r: MapRenderer;
    try {
      r = new MapRenderer(el, MAP_WIDTH, MAP_HEIGHT);
    } catch {
      failRef.current();
      return;
    }
    renderer.current = r;
    const lost = (e: Event) => {
      // 기본 동작(연결을 영영 버림)을 막아야 다시 살아난다
      e.preventDefault();
      renderer.current = null;
    };
    const restored = () => setGen((n) => n + 1);
    el.addEventListener("webglcontextlost", lost);
    el.addEventListener("webglcontextrestored", restored);
    r.setViewSource(getView);
    r.setGraticule(projectLines(glProjection, graticule));
    const theme = () => {
      r.setTheme(readTheme(el));
      setLook((n) => n + 1);
    };
    theme();
    const mo = new MutationObserver(theme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-names"],
    });
    document.fonts?.ready.then(() => setLook((n) => n + 1));
    return () => {
      mo.disconnect();
      el.removeEventListener("webglcontextlost", lost);
      el.removeEventListener("webglcontextrestored", restored);
      r.destroy();
      renderer.current = null;
    };
  }, [getView, gen]);

  useEffect(
    () =>
      shapeAllOffThread(landPieces(land), (list) =>
        renderer.current?.setLand(list),
      ),
    [land, gen],
  );

  // 나라 색은 테마(var(--x))에 따라 다르므로 테마가 바뀌어도 다시
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    return shapeAll(
      areas.map((a) => a.feature),
      (list) =>
        renderer.current?.setPolities(
          areas.map((a, i) => {
            const c = cssColor(a.color, el);
            return {
              shape: list[i],
              color: [c[0], c[1], c[2], c[3] * a.alpha],
            };
          }),
          { lineWidth: borderWidth, alpha: 1 },
        ),
    );
  }, [areas, borderWidth, look, gen]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const colors = new Map<string, number[]>();
    renderer.current?.setPaths(
      lines.map((l) => {
        let c = colors.get(l.color);
        if (!c) colors.set(l.color, (c = cssColor(l.color, el)));
        return { a: l.a, b: l.b, color: [c[0], c[1], c[2], c[3] * l.alpha] };
      }),
      lineStyle.width,
      lineStyle.dash,
    );
  }, [lines, lineStyle, look, gen]);

  // 글자 판: 화면을 그린 뒤 쉬어 가며 만들고(새 것이 오면 버림), 그사이 전 글자 판을 그린다
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelled = false;
    const frame = requestAnimationFrame(async () => {
      const names = document.documentElement.dataset.names !== "off";
      const built = await buildAtlas(
        el,
        // 나라 이름 숨기기: 글자처럼 자라는 것(나라 이름)만 뺀다
        names ? sprites : sprites.filter((s) => s.kind !== "text" || !s.grows),
        () => cancelled,
      );
      if (built && !cancelled)
        renderer.current?.setSprites(built.pages, built.sprites, zoom);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [sprites, zoom, look, gen]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}
