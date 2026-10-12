"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  polityColor,
  useMainBordersUrl,
  useMapViewport,
  usePolities,
  usePolityNames,
} from "@/components/map";
import { useTopic, useTopicState } from "./store";
import {
  currentItems,
  formatT,
  itemTitle,
  topicTitle,
  visibleItems,
} from "./logic";

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * 주제 지도: 배경은 그 해의 역사 국경(옅게), 위에 항목.
 * span(전염병): 발원지 + 그 시점까지 퍼진 지점을 선으로 잇는다.
 * persist(발명): 생긴 항목은 계속 점으로 남고, 최근 것은 크게 + 이름.
 */
export function TopicMap() {
  const { locale } = useI18n();
  const topic = useTopic();
  const t = useTopicState((s) => s.t);
  const selected = useTopicState((s) => s.selected);
  const select = useTopicState((s) => s.select);
  const focus = useTopicState((s) => s.focus);
  const vp = useMapViewport(topic.view);
  const year = Math.floor(t / 12);
  const polities = usePolities(useMainBordersUrl(year));
  const nameOf = usePolityNames(locale);

  useEffect(() => {
    if (focus) return vp.focusTo(focus.coords, Math.max(topic.view.zoom, 2.5));
    // 같은 요청(nonce)마다 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const items = useMemo(() => visibleItems(topic, t), [topic, t]);
  const highlighted = useMemo(
    () => new Set(currentItems(topic, t).map((i) => i.id)),
    [topic, t],
  );
  const unit = 1 / vp.zoom;
  const color = topic.color;

  return (
    <svg
      {...vp.svgProps((target) => {
        const id = target.closest("[data-item]")?.getAttribute("data-item");
        if (id) select(id);
      })}
      role="img"
      aria-label={`${topicTitle(topic, locale)} — ${formatT(t, topic, locale)}`}
    >
      <rect
        x={vp.v.x}
        y={0}
        width={vp.v.w}
        height={2000}
        fill="var(--map-ocean)"
      />
      {vp.copies.map((offset) => (
        <g
          key={offset}
          transform={offset ? `translate(${offset} 0)` : undefined}
        >
          <path
            d={vp.graticuleD}
            fill="none"
            stroke="var(--map-graticule)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <clipPath id={`topic-land-${offset}`}>
              <path d={vp.landD} />
            </clipPath>
          </defs>
          <path d={vp.landD} fill="var(--map-land)" />
          {/* 배경: 그 해의 나라들(옅게) */}
          <g
            clipPath={`url(#topic-land-${offset})`}
            stroke="var(--map-border)"
            strokeWidth={0.4}
          >
            {polities.map((p, i) => (
              <path
                key={`${p.properties.n}-${i}`}
                d={vp.path(p) ?? ""}
                fill={polityColor(p.properties.w ?? p.properties.n)}
                vectorEffect="non-scaling-stroke"
                style={{ fillOpacity: 0.16 }}
              />
            ))}
          </g>
          <path
            d={vp.landD}
            fill="none"
            stroke="var(--map-border)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />

          {/* 확산 경로(span): 발원지 → 그 시점까지 퍼진 지점 */}
          {topic.mode === "span" &&
            items.map((it) => {
              const pts = [
                it.coords,
                ...it.spread.filter((s) => s.t <= t).map((s) => s.coords),
              ]
                .map((c) => vp.project(c))
                .filter((p): p is readonly [number, number] => !!p);
              return (
                <g
                  key={`path-${it.id}`}
                  opacity={selected && selected !== it.id ? 0.35 : 1}
                >
                  {pts.slice(1).map((p, k) => (
                    <line
                      key={k}
                      x1={pts[0][0]}
                      y1={pts[0][1]}
                      x2={p[0]}
                      y2={p[1]}
                      stroke={color}
                      strokeWidth={1.4}
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                      opacity={0.75}
                    />
                  ))}
                  {pts.slice(1).map((p, k) => (
                    <circle
                      key={`c${k}`}
                      cx={p[0]}
                      cy={p[1]}
                      r={round2(5 * unit)}
                      fill={color}
                      fillOpacity={0.55}
                      stroke="#fff"
                      strokeWidth={round2(1 * unit)}
                    />
                  ))}
                </g>
              );
            })}

          {/* 항목 점: 터치 영역 크게, 강조 항목은 크게 + 이름 */}
          {items.map((it) => {
            const at = vp.project(it.coords);
            if (!at) return null;
            const strong = highlighted.has(it.id) || it.id === selected;
            const r = strong ? 8 : 4.5;
            return (
              <g
                key={it.id}
                data-item={it.id}
                transform={`translate(${at[0]} ${at[1]}) scale(${round2(unit * 1.2)})`}
                className="cursor-pointer"
              >
                <title>{itemTitle(it, locale)}</title>
                <circle r={16} fill="transparent" />
                {topic.mode === "span" && (
                  <circle r={r + 6} fill={color} fillOpacity={0.18} />
                )}
                <circle r={r + 2.5} fill="var(--map-pin-stroke)" />
                <circle
                  r={r}
                  fill={color}
                  stroke={it.id === selected ? "var(--foreground)" : "none"}
                  strokeWidth={2}
                />
                {strong && (
                  <text
                    y={-r - 7}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill="var(--map-label)"
                    stroke="var(--map-label-halo)"
                    strokeWidth={3}
                    paintOrder="stroke"
                    className="pointer-events-none"
                  >
                    {itemTitle(it, locale)}
                  </text>
                )}
              </g>
            );
          })}

          {/* 나라 이름(옅게, 큰 나라만) */}
          <g
            fontWeight={500}
            textAnchor="middle"
            fill="var(--muted)"
            stroke="var(--map-label-halo)"
            strokeWidth={round2(2.5 * unit)}
            paintOrder="stroke"
            className="pointer-events-none"
            opacity={0.8}
          >
            {polities
              .filter(
                (p) =>
                  p.properties.l &&
                  p.properties.a > 1_500_000 / (vp.zoom * vp.zoom),
              )
              .slice(0, 30)
              .map((p, i) => {
                const at = vp.project(p.properties.l!);
                return (
                  at && (
                    <text
                      key={`${p.properties.n}-${i}`}
                      x={at[0]}
                      y={at[1]}
                      fontSize={round2(9 * Math.pow(unit, 0.8))}
                    >
                      {nameOf(p.properties)}
                    </text>
                  )
                );
              })}
          </g>
        </g>
      ))}
    </svg>
  );
}
