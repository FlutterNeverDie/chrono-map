"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/land-110m.json";

/**
 * 평면 지도 뷰포트(도메인을 모르는 공용 부품). 전쟁 지도·주제 지도가 같이 쓴다.
 * - 메르카토르, 위도 82°N ~ 58°S, 가로 1000 단위 = 경도 360°
 * - 가로 이동은 회전(끝없이 이어짐), 세로는 확대했을 때만
 * - 끌기, 휠(커서 고정), 두 번 클릭 확대, focusTo(좌표)로 부드럽게 이동
 * - 지도 위에 떠 있는 패널(`data-map-overlay`)에 가리지 않도록 가운데를 비켜 잡는다
 */
export const MAP_WIDTH = 1000;
const SCALE = MAP_WIDTH / (2 * Math.PI);
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export const MAP_HEIGHT = Math.round(SCALE * (mercY(82) - mercY(-58)));
export const yOfLat = (lat: number) => SCALE * (mercY(82) - mercY(lat));
export const normalizeLon = (lon: number) =>
  ((((lon + 180) % 360) + 360) % 360) - 180;
export const makeProjection = (lon: number) =>
  geoMercator()
    .rotate([-lon, 0])
    .scale(SCALE)
    .translate([MAP_WIDTH / 2, SCALE * mercY(82)])
    .clipExtent([
      [0, 0],
      [MAP_WIDTH, MAP_HEIGHT],
    ]);
export const graticule = geoGraticule10();
const landTopo = world as unknown as Topology<{ land: GeometryCollection }>;
export const land = feature(landTopo, landTopo.objects.land);

const MAX_ZOOM = 10;
const round1 = (v: number) => Math.round(v * 10) / 10;

/** 패널에 가리지 않게 가운데를 옮길 화면 픽셀 (오른쪽/왼쪽 패널은 가로, 아래 시트는 세로) */
function overlayOffset(rect: DOMRect) {
  const panel = document
    .querySelector("[data-map-overlay]")
    ?.getBoundingClientRect();
  if (!panel || panel.height === 0) return { x: 0, y: 0 };
  if (panel.width < rect.width * 0.8)
    return {
      x:
        panel.left > rect.left + rect.width / 2
          ? (rect.right - panel.left) / 2
          : -(panel.right - rect.left) / 2,
      y: 0,
    };
  return { x: 0, y: (rect.bottom - panel.top) / 2 };
}

export function useMapViewport(initial: {
  lon: number;
  lat: number;
  zoom: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lon, setLon] = useState(initial.lon);
  const [centerY, setCenterY] = useState(yOfLat(initial.lat));
  const [zoom, setZoom] = useState(initial.zoom);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const state = useRef({ lon, centerY, zoom });
  // 이벤트 처리기(휠·이동 애니메이션)가 최신 값을 읽도록 그릴 때마다 갱신
  useLayoutEffect(() => {
    state.current = { lon, centerY, zoom };
  });
  const drag = useRef<{
    x: number;
    y: number;
    lon: number;
    cy: number;
    moved: boolean;
    target: Element;
  } | null>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width && height) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const view = useCallback(
    (k: number, cy: number) => {
      const w = (size ? (MAP_HEIGHT * size.w) / size.h : MAP_WIDTH) / k;
      const h = MAP_HEIGHT / k;
      return {
        x: (MAP_WIDTH - w) / 2,
        y: Math.min(MAP_HEIGHT - h, Math.max(0, cy - h / 2)),
        w,
        h,
      };
    },
    [size],
  );
  const v = view(zoom, centerY);

  // 처음 한 번: 가운데가 패널에 가리지 않도록 비켜 놓는다
  const placed = useRef(false);
  useEffect(() => {
    const svg = svgRef.current;
    if (placed.current || !size || !svg) return;
    placed.current = true;
    const rect = svg.getBoundingClientRect();
    const off = overlayOffset(rect);
    const upp = MAP_HEIGHT / state.current.zoom / rect.height;
    setLon((l) => normalizeLon(l + (off.x * upp * 360) / MAP_WIDTH));
  }, [size]);

  const zoomAt = useCallback(
    (next: number, cx: number, cy: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const { zoom: k, centerY: c } = state.current;
      const nk = Math.min(MAX_ZOOM, Math.max(1, next));
      if (!rect || nk === k) return;
      const px = (cx - rect.left) / rect.width;
      const py = (cy - rect.top) / rect.height;
      const before = view(k, c);
      const after = view(nk, c);
      const mx = before.x + px * before.w;
      const my = before.y + py * before.h;
      setLon((l) =>
        normalizeLon(l - ((after.x + px * after.w - mx) * 360) / MAP_WIDTH),
      );
      setCenterY(my - py * after.h + after.h / 2);
      setZoom(nk);
    },
    [view],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(
        state.current.zoom * Math.exp(-e.deltaY * 0.0015),
        e.clientX,
        e.clientY,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /** 좌표로 부드럽게 이동·확대 (패널에 가리지 않는 곳 가운데로) */
  const focusTo = useCallback((coords: [number, number], minZoom: number) => {
    const svg = svgRef.current;
    if (!svg) return () => {};
    const rect = svg.getBoundingClientRect();
    const off = overlayOffset(rect);
    const from = { ...state.current };
    const k2 = Math.max(from.zoom, minZoom);
    const upp = MAP_HEIGHT / k2 / rect.height;
    const toLon = coords[0] + (off.x * upp * 360) / MAP_WIDTH;
    const toY = yOfLat(coords[1]) + off.y * upp;
    const dLon = normalizeLon(toLon - from.lon);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setLon(normalizeLon(from.lon + dLon * e));
      setCenterY(from.centerY + (toY - from.centerY) * e);
      setZoom(from.zoom + (k2 - from.zoom) * e);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const { path, project } = useMemo(() => {
    const projection = makeProjection(lon);
    const project = (c: [number, number]) => {
      const r = projection(c);
      return r && ([round1(r[0]), round1(r[1])] as const);
    };
    return { path: geoPath(projection).digits(1), project };
  }, [lon]);

  /** svg에 그대로 펼쳐 넣는 속성. onTap(눌린 요소)은 끌기가 아닌 짧은 탭일 때만 */
  const svgProps = (onTap?: (target: Element) => void) => ({
    ref: svgRef,
    viewBox: `${round1(v.x)} ${round1(v.y)} ${round1(v.w)} ${round1(v.h)}`,
    preserveAspectRatio: size ? "none" : "xMidYMid slice",
    className:
      "absolute inset-0 block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing",
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        lon,
        cy: v.y + v.h / 2,
        moved: false,
        target: e.target as Element,
      };
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 5) return;
      d.moved = true;
      const upp = v.h / e.currentTarget.getBoundingClientRect().height;
      setLon(normalizeLon(d.lon - dx * upp * (360 / MAP_WIDTH)));
      setCenterY(d.cy - dy * upp);
    },
    onPointerUp: () => {
      const d = drag.current;
      drag.current = null;
      if (d && !d.moved) onTap?.(d.target);
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onDoubleClick: (e: React.MouseEvent<SVGSVGElement>) =>
      zoomAt(zoom * 2, e.clientX, e.clientY),
  });

  return {
    svgRef,
    v,
    zoom,
    lon,
    path,
    project,
    focusTo,
    svgProps,
    /** 화면이 360°보다 넓으면 좌우에 지도를 이어 붙일 오프셋들 */
    copies: v.w > MAP_WIDTH ? [-MAP_WIDTH, 0, MAP_WIDTH] : [0],
    landD: path(land) ?? "",
    graticuleD: path(graticule) ?? "",
  };
}
