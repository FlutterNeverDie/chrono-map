"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoPath } from "d3-geo";
import { useI18n } from "@/i18n/I18nProvider";
import { useWw2 } from "./store";
import {
  battleTitle,
  battlesIn,
  formatMonth,
  sideOf,
  yearOfMonth,
  type Side,
} from "./model";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  graticule,
  land,
  makeProjection,
  normalizeLon,
  useWw2Borders,
} from "./geo";

const SIDE_FILL: Record<Side, string> = {
  axis: "var(--ww2-axis)",
  allies: "var(--ww2-allies)",
  neutral: "var(--ww2-neutral)",
};
const MAX_ZOOM = 8;
const LABEL_MIN_AREA = 300_000;
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * 2차대전 지도: 그 달의 진영별 영토(연 단위 국경 + 월 단위 진영)와 진행 중인 전투.
 * 끌기(가로 회전·세로 이동), 휠·두 번 클릭 확대. 본 지도(features/map)와 코드를 공유하지 않는다.
 */
export function Ww2Map() {
  const { locale, messages } = useI18n();
  const month = useWw2((s) => s.month);
  const selected = useWw2((s) => s.selectedBattle);
  const selectBattle = useWw2((s) => s.selectBattle);
  const { polities, nameOf } = useWw2Borders(yearOfMonth(month), locale);

  const svgRef = useRef<SVGSVGElement>(null);
  const [lon, setLon] = useState(40); // 유럽~아시아가 한눈에
  const [centerY, setCenterY] = useState(MAP_HEIGHT * 0.38);
  const [zoom, setZoom] = useState(1);
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

  const { path, project } = useMemo(() => {
    const projection = makeProjection(lon);
    const project = (c: [number, number]) => {
      const p = projection(c);
      return p && ([round1(p[0]), round1(p[1])] as const);
    };
    return { path: geoPath(projection).digits(1), project };
  }, [lon]);

  const battles = useMemo(() => battlesIn(month), [month]);
  const unit = 1 / zoom;
  const landD = path(land) ?? "";
  const copies = v.w > MAP_WIDTH ? [-MAP_WIDTH, 0, MAP_WIDTH] : [0];

  // 큰 나라 이름만, 겹치면 뺀다
  const labels = (() => {
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const out: {
      key: string;
      x: number;
      y: number;
      size: number;
      text: string;
    }[] = [];
    [...polities]
      .filter(
        (p) =>
          p.properties.l && p.properties.a >= LABEL_MIN_AREA / (zoom * zoom),
      )
      .sort((a, b) => b.properties.a - a.properties.a)
      .forEach((p, i) => {
        const at = project(p.properties.l!);
        if (!at) return;
        const size = round2(
          Math.min(
            14,
            8 + Math.log10(p.properties.a / LABEL_MIN_AREA + 1) * 4,
          ) * Math.pow(unit, 0.8),
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
      aria-label={`${messages.ww2.title} — ${formatMonth(month, locale)}`}
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
            <clipPath id={`ww2-land-${offset}`}>
              <path d={landD} />
            </clipPath>
          </defs>
          <path d={landD} fill="var(--map-land)" />

          {/* 진영별 영토 */}
          <g
            clipPath={`url(#ww2-land-${offset})`}
            stroke="var(--map-border)"
            strokeWidth={0.5}
            strokeLinejoin="round"
          >
            {polities.map((p, i) => {
              const side = sideOf(p.properties.n, month);
              return (
                <path
                  key={`${p.properties.n}-${i}`}
                  d={path(p) ?? ""}
                  fill={SIDE_FILL[side]}
                  vectorEffect="non-scaling-stroke"
                  style={{ fillOpacity: side === "neutral" ? 0.35 : 0.55 }}
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

          {/* 진행 중인 전투 */}
          {battles.map((b) => {
            const at = project(b.coords);
            if (!at) return null;
            const on = b.id === selected;
            const r = b.links >= 60 ? 7 : b.links >= 40 ? 5.5 : 4.5;
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
