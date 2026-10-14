"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  polityColor,
  useMainBordersUrl,
  useMapViewport,
  usePolities,
  usePolityNames,
  labelCandidates,
} from "@/components/map";
import { useTopic, useTopicState } from "./store";
import {
  currentItems,
  formatT,
  itemTitle,
  topicTitle,
  visibleItems,
  itemColor,
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
  // 항목마다 다른 색(logic.ts의 itemColor)
  const colorOf = (id: string) => itemColor(topic, id);

  // 강조 항목 이름표 자리: 고른 항목 → 중요한 순으로 위·아래·오른쪽·왼쪽을 차례로 시도하고,
  // 다른 이름표나 **점**과 겹치면 다음 자리, 다 막히면 이름을 뺀다(고른 항목은 위에 무조건).
  // 자리 값은 점 기준 오프셋(점 배율 좌표: 실제 크기 = 값 × unit × 1.2)
  type Spot = { dx: number; dy: number; anchor: "middle" | "start" | "end" };
  const labelAt = useMemo(() => {
    const s = unit * 1.2;
    const out = new Map<string, Spot>();
    type Box = [number, number, number, number];
    const overlaps = (a: Box, b: Box) =>
      a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const isStrong = (id: string) => highlighted.has(id) || id === selected;
    // 모든 점을 장애물로
    const boxes: Box[] = [];
    for (const it of items) {
      const at = vp.project(it.coords);
      if (!at) continue;
      const rr = ((isStrong(it.id) ? 8 : 4.5) + 2.5) * s;
      boxes.push([at[0] - rr, at[1] - rr, at[0] + rr, at[1] + rr]);
    }
    const strong = items
      .filter((it) => isStrong(it.id))
      .sort(
        (a, b) =>
          Number(b.id === selected) - Number(a.id === selected) ||
          b.importance - a.importance,
      );
    for (const it of strong) {
      const at = vp.project(it.coords);
      if (!at) continue;
      const r = 8;
      const w = [...itemTitle(it, locale)].reduce(
        (sum, ch) => sum + (ch.codePointAt(0)! >= 0x2e80 ? 12 : 7),
        0,
      );
      const spots: Spot[] = [
        { dx: 0, dy: -r - 7, anchor: "middle" },
        { dx: 0, dy: r + 17, anchor: "middle" },
        { dx: r + 5, dy: 4, anchor: "start" },
        { dx: -r - 5, dy: 4, anchor: "end" },
      ];
      for (const spot of spots) {
        const left =
          spot.anchor === "middle"
            ? spot.dx - w / 2
            : spot.anchor === "start"
              ? spot.dx
              : spot.dx - w;
        const box: Box = [
          at[0] + left * s,
          at[1] + (spot.dy - 11) * s,
          at[0] + (left + w) * s,
          at[1] + (spot.dy + 3) * s,
        ];
        if (it.id !== selected && boxes.some((b) => overlaps(box, b))) continue;
        boxes.push(box);
        out.set(it.id, spot);
        break;
      }
    }
    return out;
  }, [items, highlighted, selected, unit, vp, locale]);

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
      {vp.copies.map((offset, copy) => (
        <g key={copy} transform={`translate(${offset} 0)`}>
          <path
            d={vp.graticuleD}
            fill="none"
            stroke="var(--map-graticule)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <clipPath id={`topic-land-${copy}`}>
              <path d={vp.landD} />
            </clipPath>
          </defs>
          <path d={vp.landD} fill="var(--map-land)" />
          {/* 배경: 그 해의 나라들(옅게) */}
          <g
            clipPath={`url(#topic-land-${copy})`}
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
                      stroke={colorOf(it.id)}
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
                      fill={colorOf(it.id)}
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
                  <circle r={r + 6} fill={colorOf(it.id)} fillOpacity={0.18} />
                )}
                <circle r={r + 2.5} fill="var(--map-pin-stroke)" />
                <circle
                  r={r}
                  fill={colorOf(it.id)}
                  stroke={it.id === selected ? "var(--foreground)" : "none"}
                  strokeWidth={2}
                />
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
            className="map-names pointer-events-none"
            opacity={0.8}
          >
            {labelCandidates(polities, nameOf)
              .filter(
                ({ polity }) =>
                  polity.properties.a > 1_500_000 / (vp.zoom * vp.zoom),
              )
              .slice(0, 30)
              .map(({ polity: p, text }, i) => {
                const at = vp.project(p.properties.l!);
                return (
                  at && (
                    <text
                      key={`${p.properties.n}-${i}`}
                      x={at[0]}
                      y={at[1]}
                      fontSize={round2(9 * Math.pow(unit, 0.8))}
                    >
                      {text}
                    </text>
                  )
                );
              })}
          </g>

          {/* 항목 이름: 점·나라 이름보다 위에(가려지지 않게). 자리는 labelAt.
              direction ltr: 아랍어(RTL) 페이지에서도 start = 점 오른쪽 */}
          <g
            direction="ltr"
            fontSize={12}
            fontWeight={700}
            fill="var(--map-label)"
            stroke="var(--map-label-halo)"
            strokeWidth={3}
            paintOrder="stroke"
            className="pointer-events-none"
          >
            {items.map((it) => {
              const spot = labelAt.get(it.id);
              const at = spot && vp.project(it.coords);
              return (
                at && (
                  <text
                    key={it.id}
                    transform={`translate(${at[0]} ${at[1]}) scale(${round2(unit * 1.2)})`}
                    x={spot.dx}
                    y={spot.dy}
                    textAnchor={spot.anchor}
                  >
                    {itemTitle(it, locale)}
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
