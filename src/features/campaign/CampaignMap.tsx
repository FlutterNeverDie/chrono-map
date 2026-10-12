"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoArea, geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import world from "world-atlas/land-110m.json";
import type { Locale } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";
import { useCampaign, useCampaignState } from "./store";
import {
  battleTitle,
  battlesAt,
  campaignTitle,
  formatTime,
  hasSides,
  sideOf,
  yearOf,
} from "./logic";
import type { Campaign, SideKey } from "./types";

// ── 지도 기본 (본 지도 features/map과 코드를 공유하지 않는다) ──
const MAP_WIDTH = 1000;
const SCALE = MAP_WIDTH / (2 * Math.PI);
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const MAP_HEIGHT = Math.round(SCALE * (mercY(82) - mercY(-58)));
const makeProjection = (lon: number) =>
  geoMercator()
    .rotate([-lon, 0])
    .scale(SCALE)
    .translate([MAP_WIDTH / 2, SCALE * mercY(82)])
    .clipExtent([
      [0, 0],
      [MAP_WIDTH, MAP_HEIGHT],
    ]);
const normalizeLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
const graticule = geoGraticule10();
const landTopo = world as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(landTopo, landTopo.objects.land);
const yOfLat = (lat: number) => SCALE * (mercY(82) - mercY(lat));

type PolityProps = { n: string; a: number; l?: [number, number] };
type Polity = Feature<Polygon | MultiPolygon, PolityProps>;

const SIDE_FILL: Record<SideKey, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
  n: "var(--side-n)",
};
const PALETTE = [
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
const hashColor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
};
const MAX_ZOOM = 10;
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

const cache = new Map<string, Promise<unknown>>();
const load = <T,>(url: string) => {
  if (!cache.has(url))
    cache.set(
      url,
      fetch(url).then((r) => r.json()),
    );
  return cache.get(url) as Promise<T>;
};

/** 그 해에 맞는 국경 스냅샷(public/campaigns/<id>/borders) + 언어별 나라 이름(공용 /borders/names) */
function useBorders(c: Campaign, year: number, locale: Locale) {
  const [polities, setPolities] = useState<Polity[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const snapshot = c.borderYears.reduce(
    (pick, y) => (y <= year ? y : pick),
    c.borderYears[0],
  );
  useEffect(() => {
    let alive = true;
    load<Topology<{ p: GeometryCollection<PolityProps> }>>(
      `/campaigns/${c.id}/borders/${snapshot}.json`,
    )
      .then((t) => {
        const list = (feature(t, t.objects.p).features as Polity[]).filter(
          (p) => geoArea(p) < 2 * Math.PI,
        );
        if (alive) setPolities(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [c.id, snapshot]);
  useEffect(() => {
    let alive = true;
    load<Record<string, string>>(`/borders/names/${locale}.json`)
      .then((n) => alive && setNames(n))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [locale]);
  return { polities, nameOf: (p: PolityProps) => names[p.n] || p.n };
}

/**
 * 전쟁 지도: 그 시점의 진영별 영토(진영이 없으면 나라별 색) + 진행 중인 전투.
 * 끌기(가로 회전·세로 이동), 휠·두 번 클릭 확대, 전투 목록에서 고르면 그 전투로 이동.
 */
export function CampaignMap() {
  const { locale } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const selected = useCampaignState((s) => s.selectedBattle);
  const selectBattle = useCampaignState((s) => s.selectBattle);
  const focus = useCampaignState((s) => s.focus);
  const { polities, nameOf } = useBorders(c, yearOf(t, c.unit), locale);
  const sided = hasSides(c);

  const svgRef = useRef<SVGSVGElement>(null);
  const [lon, setLon] = useState(c.view.lon);
  const [centerY, setCenterY] = useState(yOfLat(c.view.lat));
  const [zoom, setZoom] = useState(c.view.zoom);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    lon: number;
    cy: number;
    moved: boolean;
    battle: string | null;
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

  const zoomAt = useCallback(
    (next: number, cx: number, cy: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const nk = Math.min(MAX_ZOOM, Math.max(1, next));
      if (!rect || nk === zoom) return;
      const px = (cx - rect.left) / rect.width;
      const py = (cy - rect.top) / rect.height;
      const before = view(zoom, centerY);
      const after = view(nk, centerY);
      const mx = before.x + px * before.w;
      const my = before.y + py * before.h;
      setLon((l) =>
        normalizeLon(l - ((after.x + px * after.w - mx) * 360) / MAP_WIDTH),
      );
      setCenterY(my - py * after.h + after.h / 2);
      setZoom(nk);
    },
    [view, zoom, centerY],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, zoom]);

  // 처음 한 번: 지도 가운데(view)가 오른쪽 패널에 가리지 않도록 패널 폭만큼 비켜 놓는다
  const placed = useRef(false);
  useEffect(() => {
    const svg = svgRef.current;
    if (placed.current || !size || !svg) return;
    placed.current = true;
    const rect = svg.getBoundingClientRect();
    const panel = document
      .querySelector("[data-map-overlay]")
      ?.getBoundingClientRect();
    if (!panel || panel.height === 0 || panel.width >= rect.width * 0.8) return;
    const ox =
      panel.left > rect.left + rect.width / 2
        ? (rect.right - panel.left) / 2
        : -(panel.right - rect.left) / 2;
    const upp = MAP_HEIGHT / zoom / rect.height;
    setLon((l) => normalizeLon(l + (ox * upp * 360) / MAP_WIDTH));
  }, [size, zoom]);

  // 전투 목록에서 고르면 그 전투가 패널에 가리지 않는 곳 가운데로 오도록 이동
  useEffect(() => {
    const svg = svgRef.current;
    if (!focus || !svg) return;
    const rect = svg.getBoundingClientRect();
    const panel = document
      .querySelector("[data-map-overlay]")
      ?.getBoundingClientRect();
    let ox = 0;
    let oy = 0;
    if (panel && panel.height > 0) {
      if (panel.width < rect.width * 0.8)
        ox =
          panel.left > rect.left + rect.width / 2
            ? (rect.right - panel.left) / 2
            : -(panel.right - rect.left) / 2;
      else oy = (rect.bottom - panel.top) / 2;
    }
    const from = { lon, y: centerY, k: zoom };
    const k2 = Math.max(zoom, c.view.zoom * 1.6);
    const upp = MAP_HEIGHT / k2 / rect.height;
    const toLon = focus.coords[0] + (ox * upp * 360) / MAP_WIDTH;
    const toY = yOfLat(focus.coords[1]) + oy * upp;
    const dLon = normalizeLon(toLon - from.lon);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setLon(normalizeLon(from.lon + dLon * e));
      setCenterY(from.y + (toY - from.y) * e);
      setZoom(from.k + (k2 - from.k) * e);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // 같은 요청(nonce)마다 한 번만 움직인다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const { path, project } = useMemo(() => {
    const projection = makeProjection(lon);
    const project = (p: [number, number]) => {
      const r = projection(p);
      return r && ([round1(r[0]), round1(r[1])] as const);
    };
    return { path: geoPath(projection).digits(1), project };
  }, [lon]);

  const battles = useMemo(() => battlesAt(c, t), [c, t]);
  const unit = 1 / zoom;
  const landD = path(land) ?? "";
  const copies = v.w > MAP_WIDTH ? [-MAP_WIDTH, 0, MAP_WIDTH] : [0];
  const fillOf = (p: PolityProps): [string, number] => {
    if (!sided) return [hashColor(p.n), 0.45];
    const side = sideOf(c, p.n, t);
    return [SIDE_FILL[side], side === "n" ? 0.35 : 0.6];
  };

  // 이름: 확대할수록 작은 나라도, 겹치면 뺀다
  const labels = (() => {
    const minArea = 150_000 / (zoom * zoom);
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const out: {
      key: string;
      x: number;
      y: number;
      size: number;
      text: string;
    }[] = [];
    [...polities]
      .filter((p) => p.properties.l && p.properties.a >= minArea)
      .sort((a, b) => b.properties.a - a.properties.a)
      .forEach((p, i) => {
        const at = project(p.properties.l!);
        if (!at) return;
        const size = round2(
          Math.min(14, 8.5 + Math.log10(p.properties.a / 150_000 + 1) * 4) *
            Math.pow(unit, 0.8),
        );
        const text = nameOf(p.properties);
        const width = [...text].reduce(
          (w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.58) * size,
          0,
        );
        const box = {
          x0: at[0] - width / 2,
          x1: at[0] + width / 2,
          y0: at[1] - size,
          y1: at[1] + size * 0.25,
        };
        if (
          boxes.some(
            (b) =>
              box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0,
          )
        )
          return;
        boxes.push(box);
        out.push({
          key: `${p.properties.n}-${i}`,
          x: at[0],
          y: at[1],
          size,
          text,
        });
      });
    return out;
  })();

  return (
    <svg
      ref={svgRef}
      viewBox={`${round1(v.x)} ${round1(v.y)} ${round1(v.w)} ${round1(v.h)}`}
      preserveAspectRatio={size ? "none" : "xMidYMid slice"}
      role="img"
      aria-label={`${campaignTitle(c, locale)} — ${formatTime(t, c.unit, locale)}`}
      className="absolute inset-0 block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          lon,
          cy: v.y + v.h / 2,
          moved: false,
          battle:
            (e.target as Element)
              .closest("[data-battle]")
              ?.getAttribute("data-battle") ?? null,
        };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 5) return;
        d.moved = true;
        const upp = v.h / e.currentTarget.getBoundingClientRect().height;
        setLon(normalizeLon(d.lon - dx * upp * (360 / MAP_WIDTH)));
        setCenterY(d.cy - dy * upp);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved && d.battle) selectBattle(d.battle);
      }}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={(e) => zoomAt(zoom * 2, e.clientX, e.clientY)}
    >
      <rect
        x={round1(v.x)}
        y={0}
        width={round1(v.w)}
        height={MAP_HEIGHT}
        fill="var(--map-ocean)"
      />
      {copies.map((offset) => (
        <g
          key={offset}
          transform={offset ? `translate(${offset} 0)` : undefined}
        >
          <path
            d={path(graticule) ?? ""}
            fill="none"
            stroke="var(--map-graticule)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <clipPath id={`war-land-${offset}`}>
              <path d={landD} />
            </clipPath>
          </defs>
          <path d={landD} fill="var(--map-land)" />
          <g
            clipPath={`url(#war-land-${offset})`}
            stroke="var(--map-border)"
            strokeWidth={0.5}
            strokeLinejoin="round"
          >
            {polities.map((p, i) => {
              const [fill, opacity] = fillOf(p.properties);
              return (
                <path
                  key={`${p.properties.n}-${i}`}
                  d={path(p) ?? ""}
                  fill={fill}
                  vectorEffect="non-scaling-stroke"
                  style={{ fillOpacity: opacity }}
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

          {battles.map((b) => {
            const at = project(b.coords);
            if (!at) return null;
            const on = b.id === selected;
            const r = b.links >= 60 ? 7 : b.links >= 30 ? 5.5 : 4.5;
            return (
              <g
                key={b.id}
                data-battle={b.id}
                transform={`translate(${at[0]} ${at[1]}) scale(${round2(unit * 1.2)})`}
                className="cursor-pointer"
              >
                <title>{battleTitle(b, locale)}</title>
                <circle r={16} fill="transparent" />
                <circle r={r + 3} fill="var(--map-pin-stroke)" opacity={0.9} />
                <circle
                  r={r}
                  fill="#111827"
                  stroke={on ? "var(--accent)" : "#fff"}
                  strokeWidth={on ? 2.5 : 1.5}
                />
                <path
                  d={`M${-r * 0.45} ${-r * 0.45}L${r * 0.45} ${r * 0.45}M${r * 0.45} ${-r * 0.45}L${-r * 0.45} ${r * 0.45}`}
                  stroke="#fff"
                  strokeWidth={1.4}
                />
              </g>
            );
          })}

          <g
            fontWeight={600}
            textAnchor="middle"
            fill="var(--map-label)"
            stroke="var(--map-label-halo)"
            strokeWidth={round2(3 * unit)}
            paintOrder="stroke"
            className="pointer-events-none"
          >
            {labels.map((l) => (
              <text key={l.key} x={l.x} y={l.y} fontSize={l.size}>
                {l.text}
              </text>
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}
