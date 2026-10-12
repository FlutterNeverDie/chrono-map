"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoPath } from "d3-geo";
import { usePeriod } from "@/store/timeline";
import { MAX_ZOOM, useUi } from "@/store/ui";
import { useVisibleEvents } from "@/store/useVisibleEvents";
import { limitPins } from "@/lib/events";
import { eventTitle } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { formatPeriod } from "@/lib/period";
import { REGION_BY_ID } from "@/data/regions";
import { DEFAULT_VIEWPOINT, VIEWPOINT_BY_ID } from "@/data/viewpoints";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  graticule,
  land,
  loadDetailedLand,
  makeProjection,
  normalizeLon,
} from "./baseMap";
import { useBorders, type PolityProps } from "./borders";

const DEFAULT_LON = VIEWPOINT_BY_ID.get(DEFAULT_VIEWPOINT)!.lon;
/** 이 픽셀보다 적게 움직이면 끌기가 아니라 탭으로 본다 */
const TAP_SLOP = 5;
/** 배율 1에서 이름을 표시할 최소 면적(km²). 확대할수록 작은 나라도 표시 */
const LABEL_MIN_AREA = 200_000;

/** 정치체마다 고정된 색 (Wikidata ID/이름 해시) */
const POLITY_COLORS = [
  "#e76f51",
  "#f4a261",
  "#e9c46a",
  "#8ab17d",
  "#2a9d8f",
  "#5e9fd1",
  "#8d7bd1",
  "#d17bb4",
  "#c9886b",
  "#7fa7a0",
];
function polityColor(p: PolityProps): string {
  const key = p.w ?? p.n;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return POLITY_COLORS[Math.abs(h) % POLITY_COLORS.length];
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

type Gesture = {
  /** 한 손가락/마우스: 끌기 시작 시점의 값 */
  x: number;
  y: number;
  lon: number;
  centerY: number;
  moved: boolean;
  eventId: string | null;
  polity: string | null;
  /** 두 손가락: 핀치 시작 거리와 배율 */
  pinch?: { dist: number; zoom: number };
};

/**
 * 하단 바 위 영역을 모두 덮는 평면 세계지도.
 * - 나라 영역·이름은 선택 연도의 역사 국경(borders.ts)
 * - 가로: 지구를 돌리듯 끝없이 이어진다(회전). 세로: 확대했을 때만 움직인다
 * - 확대: 휠, 두 손가락 핀치, 두 번 클릭, +/− 버튼(ZoomControls)
 * - 나라를 누르면 강조하고 이름을 항상 보여준다. 다시 누르면 해제
 */
export function WorldMap() {
  const { locale, messages } = useI18n();
  const period = usePeriod();
  const viewpoint = useUi((s) => s.viewpoint);
  const setViewpoint = useUi((s) => s.setViewpoint);
  const setCenterLon = useUi((s) => s.setCenterLon);
  const zoom = useUi((s) => s.zoom);
  const setZoom = useUi((s) => s.setZoom);
  const selectEvent = useUi((s) => s.selectEvent);
  const selectedEventId = useUi((s) => s.selectedEventId);
  const { polities, nameOf } = useBorders(period.start, locale);

  const svgRef = useRef<SVGSVGElement>(null);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [centerY, setCenterY] = useState(MAP_HEIGHT / 2);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [selectedPolity, setSelectedPolity] = useState<string | null>(null);
  const lonRef = useRef(DEFAULT_LON);
  const centerYRef = useRef(MAP_HEIGHT / 2);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  const updateLon = useCallback((next: number) => {
    lonRef.current = normalizeLon(next);
    setLon(lonRef.current);
  }, []);
  const updateCenterY = useCallback((next: number) => {
    centerYRef.current = next;
    setCenterY(next);
  }, []);

  // 화면 크기: 세로(위도 전체)를 높이에 맞추고 가로는 비율만큼
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** 보이는 범위(지도 좌표). 가로는 항상 가운데 고정이고, 가로 이동은 회전(lon)으로 한다 */
  const view = useCallback(
    (k: number, cy: number) => {
      const baseW = size ? (MAP_HEIGHT * size.w) / size.h : MAP_WIDTH;
      const w = baseW / k;
      const h = MAP_HEIGHT / k;
      const y = Math.min(MAP_HEIGHT - h, Math.max(0, cy - h / 2));
      return { x: (MAP_WIDTH - w) / 2, y, w, h };
    },
    [size],
  );
  const v = view(zoom, centerY);

  /** 화면 좌표(cx, cy)를 고정점으로 배율을 바꾼다 */
  const zoomAt = useCallback(
    (nextZoom: number, cx: number, cy: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const k = useUi.getState().zoom;
      const nk = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
      if (!rect || nk === k) return;
      const px = (cx - rect.left) / rect.width;
      const py = (cy - rect.top) / rect.height;
      const before = view(k, centerYRef.current);
      const mx = before.x + px * before.w;
      const my = before.y + py * before.h;
      const after = view(nk, centerYRef.current);
      // 고정점이 같은 화면 위치에 오도록: 가로는 회전, 세로는 중심 이동
      const dx = after.x + px * after.w - mx;
      updateLon(lonRef.current - (dx * 360) / MAP_WIDTH);
      updateCenterY(my - py * after.h + after.h / 2);
      setZoom(nk);
    },
    [view, setZoom, updateLon, updateCenterY],
  );

  // 휠 확대 (페이지 스크롤을 막아야 해서 passive: false로 직접 등록)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = useUi.getState().zoom;
      zoomAt(k * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // 시점이 바뀌면 가까운 방향으로 회전
  useEffect(() => {
    if (!viewpoint) return;
    const target = VIEWPOINT_BY_ID.get(viewpoint)!.lon;
    const from = lonRef.current;
    const delta = normalizeLon(target - from);
    if (Math.abs(delta) < 0.01) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      updateLon(from + delta * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setCenterLon(lonRef.current);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [viewpoint, setCenterLon, updateLon]);

  // 사건 목록에서 고르면 그 사건이 "가려지지 않은 영역"의 가운데 오도록 이동·확대
  const focus = useUi((s) => s.focus);
  useEffect(() => {
    const svg = svgRef.current;
    if (!focus || !svg) return;
    const rect = svg.getBoundingClientRect();
    // 지도 위에 떠 있는 패널(데스크톱 오른쪽 / 모바일 아래)만큼 비켜서 가운데를 잡는다
    const panel = document
      .querySelector("[data-map-overlay]")
      ?.getBoundingClientRect();
    let offsetX = 0;
    let offsetY = 0;
    if (panel && panel.height > 0) {
      if (panel.width < rect.width * 0.8) {
        // 패널이 오른쪽(보통)이면 지도 가운데를 오른쪽으로, 왼쪽(아랍어 RTL)이면 왼쪽으로
        offsetX =
          panel.left > rect.left + rect.width / 2
            ? (rect.right - panel.left) / 2
            : -(panel.right - rect.left) / 2;
      } else offsetY = (rect.bottom - panel.top) / 2;
    }
    const fromLon = lonRef.current;
    const fromY = centerYRef.current;
    const fromZoom = useUi.getState().zoom;
    const toZoom = Math.max(fromZoom, 2.5);
    const upp = MAP_HEIGHT / toZoom / rect.height; // 목표 배율에서 픽셀당 지도 단위
    const toLon = focus.coords[0] + (offsetX * upp * 360) / MAP_WIDTH;
    const pointY = makeProjection(0)([0, focus.coords[1]])?.[1] ?? fromY;
    const toY = pointY + offsetY * upp;
    const dLon = normalizeLon(toLon - fromLon);
    setViewpoint(null);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      updateLon(fromLon + dLon * k);
      updateCenterY(fromY + (toY - fromY) * k);
      setZoom(fromZoom + (toZoom - fromZoom) * k);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setCenterLon(lonRef.current);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [focus, setViewpoint, setCenterLon, setZoom, updateLon, updateCenterY]);

  // 해안선: 처음엔 가벼운 110m, 확대하면 자세한 50m로 바꾼다(한 번 받으면 계속 사용)
  const [detailedLand, setDetailedLand] = useState<typeof land | null>(null);
  useEffect(() => {
    if (zoom < 1.5 || detailedLand) return;
    let alive = true;
    loadDetailedLand()
      .then((l) => alive && setDetailedLand(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [zoom, detailedLand]);
  const landShape = zoom >= 1.5 && detailedLand ? detailedLand : land;

  const visible = useVisibleEvents();
  const events = useMemo(
    () => limitPins(visible, selectedEventId),
    [visible, selectedEventId],
  );
  // 성능: 투영은 경도 0에서 한 번만 하고, 좌우 이동(회전)은 그룹을 옮기는 것(translate)으로 처리한다.
  // 메르카토르에서 경도 회전 = 가로 평행 이동이라 결과가 같고, 끌 때마다 모든 국경을 다시 계산하지 않는다.
  const { path, project } = useMemo(() => {
    const projection = makeProjection(0);
    // 서버(Node)와 브라우저의 부동소수점 끝자리가 달라 하이드레이션 불일치가 나지 않도록 반올림
    const project = (coords: [number, number]) => {
      const p = projection(coords);
      return p && ([round1(p[0]), round1(p[1])] as const);
    };
    return { path: geoPath(projection).digits(1), project };
  }, []);

  // 확대할수록 작은 나라 이름도 보여준다. 선택한 나라는 항상
  // 나라가 적은 시대(고대 초기 등)는 작은 나라도 이름을 모두 보여준다
  const labeled = useMemo(() => {
    const minArea = polities.length <= 30 ? 0 : LABEL_MIN_AREA / (zoom * zoom);
    return polities
      .filter(
        (p) =>
          p.properties.l &&
          (p.properties.a >= minArea || p.properties.n === selectedPolity),
      )
      .sort((a, b) => b.properties.a - a.properties.a)
      .slice(0, Math.round(45 * zoom));
  }, [polities, zoom, selectedPolity]);

  // 글자·핀은 확대해도 화면에서 거의 같은 크기로 (지도 좌표 ÷ 배율)
  const unit = 1 / zoom;

  // 이름 배치: 큰 나라부터 놓고, 이미 놓인 이름과 겹치면 뺀다(선택한 나라는 항상 먼저)
  const placedLabels = useMemo(() => {
    const ordered = [...labeled].sort(
      (a, b) =>
        Number(b.properties.n === selectedPolity) -
        Number(a.properties.n === selectedPolity),
    );
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const placed: {
      key: string;
      x: number;
      y: number;
      fontSize: number;
      text: string;
    }[] = [];
    ordered.forEach((p, i) => {
      const at = project(p.properties.l!);
      if (!at) return;
      // 기본 8.5, 큰 나라일수록 최대 15까지 (지도 좌표 단위)
      const base = Math.min(
        15,
        8.5 + Math.log10(Math.max(1, p.properties.a / LABEL_MIN_AREA)) * 4,
      );
      const selected = p.properties.n === selectedPolity;
      const fontSize = round2(
        (selected ? Math.max(base, 13) : base) * Math.pow(unit, 0.8),
      );
      const text = nameOf(p.properties);
      // 글자 폭 추정: 한글·한자 등은 글자 크기만큼, 라틴 문자는 약 0.58배
      const width = [...text].reduce(
        (w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.58) * fontSize,
        0,
      );
      const boxAt = (y: number) => ({
        x0: at[0] - width / 2,
        x1: at[0] + width / 2,
        y0: y - fontSize,
        y1: y + fontSize * 0.25,
      });
      const free = (b: ReturnType<typeof boxAt>) =>
        !boxes.some(
          (o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0,
        );
      // 제자리가 막히면 위아래로 조금씩 비켜 본다
      const y = [0, 1.3, -1.3, 2.6, -2.6]
        .map((step) => at[1] + step * fontSize)
        .find((cy) => free(boxAt(cy)));
      // 나라가 적은 시대(고대 초기)·선택한 나라는 자리가 없어도 표시한다
      if (y === undefined && !selected && polities.length > 30) return;
      const finalY = round1(y ?? at[1]);
      boxes.push(boxAt(finalY));
      placed.push({
        key: `${p.properties.n}-${i}`,
        x: at[0],
        y: finalY,
        fontSize,
        text,
      });
    });
    return placed;
  }, [labeled, selectedPolity, project, unit, nameOf, polities.length]);
  const landD = useMemo(() => path(landShape) ?? "", [path, landShape]);
  const graticuleD = useMemo(() => path(graticule) ?? "", [path]);
  const polityDs = useMemo(
    () => polities.map((p) => path(p) ?? ""),
    [path, polities],
  );
  // 지금 경도만큼 옮긴 위치에 지도를 놓고, 화면에 걸치는 복사본만 그린다(끝없이 이어지는 지도)
  const shift = round1((-lon * MAP_WIDTH) / 360);
  const copies = [-2, -1, 0, 1, 2]
    .map((k) => round1(shift + k * MAP_WIDTH))
    .filter((o) => o < v.x + v.w && o + MAP_WIDTH > v.x);

  // 지도 내용은 끌기 중에 바뀌지 않으므로 한 번 만들어 복사본마다 재사용(React가 다시 그리지 않는다)
  const layer = useMemo(
    () => (
      <>
        <path
          d={graticuleD}
          fill="none"
          stroke="var(--map-graticule)"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* 육지 + 나라 영역. 나라 색은 해안선 모양으로 잘라 바다로 번지지 않게 한다 */}
        <path d={landD} fill="var(--map-land)" />

        {/* 선택 연도의 나라 영역 */}
        <g
          clipPath="url(#land-clip)"
          stroke="var(--map-border)"
          strokeWidth={0.6}
          strokeLinejoin="round"
        >
          {polities.map((p, i) => {
            const selected = p.properties.n === selectedPolity;
            return (
              <path
                key={`${p.properties.n}-${i}`}
                data-polity={p.properties.n}
                d={polityDs[i]}
                fill={polityColor(p.properties)}
                vectorEffect="non-scaling-stroke"
                style={
                  selected
                    ? {
                        fillOpacity: "calc(var(--map-region-opacity) + 0.3)",
                        stroke: "var(--map-label)",
                        strokeWidth: 1.6,
                      }
                    : { fillOpacity: "var(--map-region-opacity)" }
                }
              />
            );
          })}
        </g>
        <path
          d={landD}
          fill="none"
          stroke="var(--map-border)"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* 사건 핀: 보이는 점은 작게, 터치 영역(r=16)은 크게. 확대해도 화면 크기 유지 */}
        {events.map((e) => {
          const p = project(e.coords);
          const region = REGION_BY_ID.get(e.region);
          if (!p || !region) return null;
          const selected = e.id === selectedEventId;
          return (
            <g
              key={e.id}
              data-event-id={e.id}
              transform={`translate(${p[0]} ${p[1]}) scale(${round2(unit * 1.2)})`}
              className="cursor-pointer"
            >
              <title>{`${formatWhen(e, locale)} ${eventTitle(e, locale)}`}</title>
              <circle r={16} fill="transparent" />
              <circle r={selected ? 7.5 : 6} fill="var(--map-pin-stroke)" />
              <circle
                r={selected ? 5 : 4}
                fill={region.color}
                stroke="var(--map-pin-ring)"
                strokeWidth={selected ? 1.5 : 1}
              />
            </g>
          );
        })}

        {/* 나라 이름: 큰 나라부터, 면적에 따라 글자 크기. 핀보다 위에 그리되 터치는 통과 */}
        <g
          fontWeight={600}
          textAnchor="middle"
          fill="var(--map-label)"
          stroke="var(--map-label-halo)"
          strokeWidth={round2(3 * unit)}
          paintOrder="stroke"
          className="pointer-events-none"
        >
          {placedLabels.map((label) => (
            <text
              key={label.key}
              x={label.x}
              y={label.y}
              fontSize={label.fontSize}
            >
              {label.text}
            </text>
          ))}
        </g>
      </>
    ),
    [
      graticuleD,
      landD,
      polities,
      polityDs,
      selectedPolity,
      events,
      project,
      unit,
      selectedEventId,
      locale,
      placedLabels,
    ],
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...pointers.current.values()];
    if (b) {
      // 두 번째 손가락: 핀치 시작
      gesture.current = {
        x: a.x,
        y: a.y,
        lon: lonRef.current,
        centerY: centerYRef.current,
        moved: true,
        eventId: null,
        polity: null,
        pinch: {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          zoom: useUi.getState().zoom,
        },
      };
      return;
    }
    const target = e.target as Element;
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      lon: lonRef.current,
      // 화면 끝에 붙어 잘린 중심값 대신 실제로 보이는 중심에서 시작
      centerY: v.y + v.h / 2,
      moved: false,
      eventId:
        target.closest("[data-event-id]")?.getAttribute("data-event-id") ??
        null,
      polity:
        target.closest("[data-polity]")?.getAttribute("data-polity") ?? null,
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...pointers.current.values()];

    if (g.pinch && b) {
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(
        g.pinch.zoom * (dist / g.pinch.dist),
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
      );
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!g.moved) {
      g.moved = true;
      setViewpoint(null);
    }
    const unitsPerPixel = v.h / e.currentTarget.getBoundingClientRect().height;
    updateLon(g.lon - dx * unitsPerPixel * (360 / MAP_WIDTH));
    updateCenterY(g.centerY - dy * unitsPerPixel);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // 핀치 중 한 손가락만 뗐으면 남은 손가락으로 이어서 끌기
      const [rest] = [...pointers.current.values()];
      if (g) {
        gesture.current = {
          ...g,
          pinch: undefined,
          x: rest.x,
          y: rest.y,
          lon: lonRef.current,
          centerY: centerYRef.current,
        };
      }
      return;
    }
    gesture.current = null;
    if (!g) return;
    if (g.moved) {
      setCenterLon(lonRef.current);
      return;
    }
    if (g.eventId) selectEvent(g.eventId);
    else
      setSelectedPolity((cur) =>
        g.polity && g.polity !== cur ? g.polity : null,
      );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${round1(v.x)} ${round1(v.y)} ${round1(v.w)} ${round1(v.h)}`}
      preserveAspectRatio={size ? "none" : "xMidYMid slice"}
      role="img"
      aria-label={fill(messages.ui.mapLabel, {
        year: formatPeriod(period, locale),
      })}
      className="absolute inset-0 block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        gesture.current = null;
      }}
      onDoubleClick={(e) => zoomAt(zoom * 2, e.clientX, e.clientY)}
    >
      <rect
        x={round1(v.x)}
        y={0}
        width={round1(v.w)}
        height={MAP_HEIGHT}
        fill="var(--map-ocean)"
      />
      <defs>
        <clipPath id="land-clip">
          <path d={landD} />
        </clipPath>
      </defs>
      {copies.map((offset) => (
        <g key={offset} transform={`translate(${offset} 0)`}>
          {layer}
        </g>
      ))}
    </svg>
  );
}
