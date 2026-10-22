"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  MAP_HEIGHT,
  labelCandidates,
  polityColor,
  useMainBordersUrl,
  usePolities,
  usePolityNames,
} from "@/components/map";
import { useGlViewport } from "@/components/map/useGlViewport";
import { useLandFor } from "@/components/map/detailedLand";
import { Compass } from "@/components/map/Compass";
import { YoutubeButton } from "@/components/ui/YoutubeButton";
import { YOUTUBE_URL } from "@/lib/channel";
import {
  GlCanvas,
  type GlArea,
  type GlLine,
} from "@/components/map/gl/GlCanvas";
import type { AtlasSpec } from "@/components/map/gl/atlas";
import { glProjection } from "@/components/map/gl/shapes";
import { useTopic, useTopicState } from "./store";
import { useTopicPoints, visiblePoints } from "./points";
import {
  currentItems,
  formatT,
  itemColor,
  itemLabelSpots,
  itemTitle,
  topicTitle,
  visibleItems,
} from "./logic";

/** 휴대폰은 오른쪽 위, 데스크톱은 지도 오른쪽 아래(목록 패널 왼쪽) - 지도 칸 기준 */
const COMPASS_PLACE =
  "absolute end-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 lg:top-auto lg:bottom-3 lg:end-[35.5rem] xl:end-[41.5rem] 2xl:end-[47.5rem]";
const LINE_STYLE = { width: 1.4, dash: [4, 3] as [number, number] };
const project = (c: [number, number]) => glProjection(c) ?? null;

/** 원 하나(가운데 cx, cy, 반지름 r px): 채우기·테두리 */
function disk(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  fillAlpha = 1,
) {
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.globalAlpha = fillAlpha;
  g.fillStyle = fill;
  g.fill();
  g.globalAlpha = 1;
}

/**
 * 주제 지도 WebGL 판: svg 판(TopicMap)과 같은 그림 - 옅은 국경, 확산 점선·지점, 항목 점, 옅은 나라 이름, 항목 이름.
 * 점·이름은 글자 판(AtlasSpec)으로, 크기는 svg처럼 화면에서 그대로(핀 그림 단위 u px). 손짓·기울이기·방향은 useGlViewport.
 */
export function TopicMapGl({ onFail }: { onFail: () => void }) {
  const { locale, messages } = useI18n();
  const topic = useTopic();
  const t = useTopicState((s) => s.t);
  const selected = useTopicState((s) => s.selected);
  const select = useTopicState((s) => s.select);
  const selectedPoint = useTopicState((s) => s.selectedPoint);
  const selectPoint = useTopicState((s) => s.selectPoint);
  const focus = useTopicState((s) => s.focus);
  const year = Math.floor(t / 12);
  const polities = usePolities(useMainBordersUrl(year));
  const nameOf = usePolityNames(locale);
  const items = useMemo(() => visibleItems(topic, t), [topic, t]);
  const highlighted = useMemo(
    () => new Set(currentItems(topic, t).map((i) => i.id)),
    [topic, t],
  );
  // 항목 안의 작은 점(전쟁 목록의 전투) - 그 기간에만
  const allSubs = useTopicPoints(topic, locale);
  const subs = useMemo(
    () => visiblePoints(allSubs, t, items),
    [allSubs, t, items],
  );
  const points = useMemo(
    () =>
      items.flatMap((it) => {
        const p = project(it.coords);
        return p ? [{ id: it.id, x: p[0], y: p[1] }] : [];
      }),
    [items],
  );
  const subPoints = useMemo(
    () =>
      subs.flatMap((s) => {
        const p = project(s.coords);
        return p ? [{ s, x: p[0], y: p[1] }] : [];
      }),
    [subs],
  );
  const { hostProps, canvasRef, getView, zoom, frame, focusTo, compass } =
    useGlViewport(topic.view, (cx, cy, nearest) => {
      // 항목 점(크다)에 바로 닿았으면 항목, 아니면 가까운 작은 점, 그다음 넓게 항목
      const item = nearest(points, cx, cy, 9);
      const sub = !item && nearest(subPoints, cx, cy);
      const hit = item ?? (sub ? null : nearest(points, cx, cy));
      if (sub) selectPoint(sub.s);
      else if (hit) select(hit.id);
    });
  const land = useLandFor(zoom);

  useEffect(() => {
    if (focus) return focusTo(focus.coords, Math.max(topic.view.zoom, 2.5));
    // 같은 요청(nonce)마다 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const areas = useMemo(
    (): GlArea[] =>
      polities.map((p) => ({
        feature: p,
        color: polityColor(p.properties.w ?? p.properties.n),
        alpha: 0.16,
      })),
    [polities],
  );
  // 확산 경로: 발원지 → 그 시점까지 퍼진 지점 (persist여도 spread가 있으면 - 종교 전파). 다른 항목을 골랐으면 옅게
  const lines = useMemo(
    (): GlLine[] =>
      items.flatMap((it) => {
        const o = project(it.coords);
        if (!o) return [];
        return it.spread
          .filter((s) => s.t <= t)
          .flatMap((s) => {
            const p = project(s.coords);
            return p
              ? [
                  {
                    a: [o[0], o[1]] as [number, number],
                    b: [p[0], p[1]] as [number, number],
                    color: itemColor(topic, it.id),
                    alpha: 0.75 * (selected && selected !== it.id ? 0.35 : 1),
                  },
                ]
              : [];
          });
      }),
    [items, t, topic, selected],
  );

  const sprites = useMemo((): AtlasSpec[] => {
    if (!frame) return [];
    const u = (1.2 * frame.h) / MAP_HEIGHT;
    const px = (zoom * frame.h) / MAP_HEIGHT;
    const out: AtlasSpec[] = [];
    // 작은 점(전투): 항목 색 작은 원 + 흰 테두리, 고른 점은 크게 + 진한 테두리
    for (const { s, x, y } of subPoints) {
      const on = s.id === selectedPoint?.id;
      const color = itemColor(topic, s.item);
      const r = on ? 4.5 : 3;
      const w = (r + 2.5) * 2 * u + 2;
      out.push({
        kind: "shape",
        x,
        y,
        layer: 0,
        key: `p${color}${on}`,
        w,
        h: w,
        ox: -w / 2,
        oy: -w / 2,
        draw: (g, css) => {
          const c = w / 2;
          disk(
            g,
            c,
            c,
            (r + 1.5) * u,
            css(on ? "var(--foreground)" : "var(--map-pin-stroke)"),
          );
          disk(g, c, c, r * u, color);
        },
      });
      // 고른 점: 위에 이름, 아래에 때
      if (on) {
        const text = (
          t: string,
          dy: number,
          size: number,
          weight: number,
          fill: string,
        ) =>
          out.push({
            kind: "text",
            x,
            y,
            layer: 2,
            grows: false,
            text: t,
            size: size * u,
            weight,
            fill,
            halo: 3 * u,
            haloColor: "var(--map-label-halo)",
            align: "center",
            dy: dy * u,
          });
        text(s.title, -10, 12, 700, "var(--map-label)");
        text(s.when, 18, 10.5, 600, "var(--muted)");
      }
    }
    // 확산 지점(반지름 5/1.2 핀 단위, 흰 테두리)
    for (const it of items) {
      const color = itemColor(topic, it.id);
      const dim = selected && selected !== it.id ? 0.35 : 1;
      for (const s of it.spread) {
        if (s.t > t) continue;
        const p = project(s.coords);
        if (!p) continue;
        const r = (5 / 1.2) * u;
        const sw = u / 1.2;
        const w = (r + sw) * 2 + 2;
        out.push({
          kind: "shape",
          x: p[0],
          y: p[1],
          layer: 0,
          key: `s${color}${dim}`,
          w,
          h: w,
          ox: -w / 2,
          oy: -w / 2,
          draw: (g) => {
            g.beginPath();
            g.arc(w / 2, w / 2, r, 0, Math.PI * 2);
            g.globalAlpha = 0.55 * dim;
            g.fillStyle = color;
            g.fill();
            g.globalAlpha = dim;
            g.lineWidth = sw;
            g.strokeStyle = "#fff";
            g.stroke();
            g.globalAlpha = 1;
          },
        });
      }
    }
    // 항목 점: 강조 항목은 크게, span은 둘레에 옅은 빛, 고른 항목은 진한 테두리
    for (const it of items) {
      const p = project(it.coords);
      if (!p) continue;
      const color = itemColor(topic, it.id);
      const on = it.id === selected;
      const strong = highlighted.has(it.id) || on;
      const r = strong ? 8 : 4.5;
      const outer = (topic.mode === "span" ? r + 6 : r + 2.5) + 1;
      const w = outer * 2 * u + 2;
      out.push({
        kind: "shape",
        x: p[0],
        y: p[1],
        layer: 0,
        key: `i${color}${r}${on}${topic.mode}`,
        w,
        h: w,
        ox: -w / 2,
        oy: -w / 2,
        draw: (g, css) => {
          const c = w / 2;
          if (topic.mode === "span") disk(g, c, c, (r + 6) * u, color, 0.18);
          disk(g, c, c, (r + 2.5) * u, css("var(--map-pin-stroke)"));
          disk(g, c, c, r * u, color);
          if (on) {
            g.beginPath();
            g.arc(c, c, r * u, 0, Math.PI * 2);
            g.lineWidth = 2 * u;
            g.strokeStyle = css("var(--foreground)");
            g.stroke();
          }
        },
      });
    }
    // 나라 이름(옅게, 큰 나라만 30개)
    labelCandidates(polities, nameOf)
      .filter(({ polity }) => polity.properties.a > 1_500_000 / (zoom * zoom))
      .slice(0, 30)
      .forEach(({ polity, text }) => {
        const p = project(polity.properties.l!);
        if (!p) return;
        out.push({
          kind: "text",
          x: p[0],
          y: p[1],
          layer: 1,
          grows: true,
          text,
          size: 9 * Math.pow(1 / zoom, 0.8) * px,
          weight: 500,
          fill: "var(--muted)",
          halo: (2.5 * u) / 1.2,
          haloColor: "var(--map-label-halo)",
          align: "center",
          alpha: 0.8,
        });
      });
    // 항목 이름: 점·나라 이름보다 위
    const spots = itemLabelSpots(
      items,
      (id) => highlighted.has(id) || id === selected,
      selected,
      project,
      zoom,
      (it) => itemTitle(it, locale),
    );
    for (const it of items) {
      const spot = spots.get(it.id);
      const p = spot && project(it.coords);
      if (!spot || !p) continue;
      out.push({
        kind: "text",
        x: p[0],
        y: p[1],
        layer: 2,
        grows: false,
        text: itemTitle(it, locale),
        size: 12 * u,
        weight: 700,
        fill: "var(--map-label)",
        halo: 3 * u,
        haloColor: "var(--map-label-halo)",
        align:
          spot.anchor === "middle"
            ? "center"
            : spot.anchor === "start"
              ? "left"
              : "right",
        dx: spot.dx * u,
        dy: spot.dy * u,
      });
    }
    return out;
  }, [
    frame,
    zoom,
    items,
    topic,
    selected,
    highlighted,
    t,
    polities,
    nameOf,
    locale,
    subPoints,
    selectedPoint,
  ]);

  return (
    <>
      <div
        {...hostProps}
        role="img"
        aria-label={`${topicTitle(topic, locale)} - ${formatT(t, topic, locale)}`}
      >
        <GlCanvas
          ref={canvasRef}
          getView={getView}
          land={land}
          areas={areas}
          borderWidth={0.4}
          lines={lines}
          lineStyle={LINE_STYLE}
          sprites={sprites}
          zoom={zoom}
          onFail={onFail}
        />
      </div>
      <Compass
        {...compass}
        place={COMPASS_PLACE}
        side={<YoutubeButton href={YOUTUBE_URL} label={messages.ui.youtube} />}
        text={{
          reset: messages.ui.resetView,
          hintMouse: messages.ui.viewHintMouse,
          hintTouch: messages.ui.viewHintTouch,
          close: messages.ui.close,
        }}
      />
    </>
  );
}
