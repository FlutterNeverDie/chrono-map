"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { MAP_HEIGHT, usePolities, usePolityNames } from "@/components/map";
import { useGlViewport } from "@/components/map/useGlViewport";
import { useLandFor } from "@/components/map/detailedLand";
import { Compass } from "@/components/map/Compass";
import { YoutubeButton } from "@/components/ui/YoutubeButton";
import { YOUTUBE_URL } from "@/lib/channel";
import { GlCanvas, type GlArea } from "@/components/map/gl/GlCanvas";
import type { AtlasSpec } from "@/components/map/gl/atlas";
import { glProjection } from "@/components/map/gl/shapes";
import { useCampaign, useCampaignState } from "./store";
import { battlesAt, campaignTitle, formatTime, yearOf } from "./logic";
import { battleRadius, polityFill, polityLabels } from "./mapStyle";

/** 휴대폰은 상단 바 아래 오른쪽, 데스크톱은 지도 오른쪽 아래(전투 패널 왼쪽) - 지도 칸 기준 */
const COMPASS_PLACE =
  "absolute end-3 top-[calc(var(--top-h)+0.25rem)] z-10 lg:top-auto lg:bottom-3 lg:end-[35.5rem] xl:end-[41.5rem] 2xl:end-[47.5rem]";
const NO_LINES: never[] = [];
const LINE_STYLE = { width: 1 };
const project = (c: [number, number]) => glProjection(c) ?? null;

/**
 * 전쟁 지도 WebGL 판: svg 판(CampaignMap)과 같은 그림 - 진영별 영토(진영이 없으면 나라별 색), 전투 표시, 나라 이름.
 * 전투 표시·이름은 글자 판(AtlasSpec). 손짓·기울이기·방향은 useGlViewport.
 */
export function CampaignMapGl({ onFail }: { onFail: () => void }) {
  const { locale, messages } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const selected = useCampaignState((s) => s.selectedBattle);
  const selectBattle = useCampaignState((s) => s.selectBattle);
  const focus = useCampaignState((s) => s.focus);
  const year = yearOf(t, c.unit);
  const snapshot = c.borderYears.reduce(
    (pick, y) => (y <= year ? y : pick),
    c.borderYears[0],
  );
  const polities = usePolities(`/campaigns/${c.id}/borders/${snapshot}.json`);
  const nameOf = usePolityNames(locale);
  const battles = useMemo(() => battlesAt(c, t), [c, t]);
  const points = useMemo(
    () =>
      battles.flatMap((b) => {
        const p = project(b.coords);
        return p ? [{ id: b.id, x: p[0], y: p[1] }] : [];
      }),
    [battles],
  );
  const { hostProps, canvasRef, getView, zoom, frame, focusTo, compass } =
    useGlViewport(c.view, (cx, cy, nearest) => {
      const hit = nearest(points, cx, cy);
      if (hit) selectBattle(hit.id);
    });
  const land = useLandFor(zoom);

  useEffect(() => {
    if (focus) return focusTo(focus.coords, c.view.zoom * 1.6);
    // 같은 요청(nonce)마다 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const areas = useMemo(
    (): GlArea[] =>
      polities.map((p) => {
        const [color, alpha] = polityFill(c, p.properties, t);
        return { feature: p, color, alpha };
      }),
    [polities, c, t],
  );

  const sprites = useMemo((): AtlasSpec[] => {
    if (!frame) return [];
    const u = (1.2 * frame.h) / MAP_HEIGHT;
    const px = (zoom * frame.h) / MAP_HEIGHT;
    const out: AtlasSpec[] = [];
    // 전투: 진한 원 + 흰(고른 것은 강조색) 테두리 + ×
    for (const b of battles) {
      const p = project(b.coords);
      if (!p) continue;
      const on = b.id === selected;
      const r = battleRadius(b);
      const w = (r + 4) * 2 * u + 2;
      out.push({
        kind: "shape",
        x: p[0],
        y: p[1],
        layer: 0,
        key: `b${r}${on}`,
        w,
        h: w,
        ox: -w / 2,
        oy: -w / 2,
        draw: (g, css) => {
          g.translate(w / 2, w / 2);
          g.scale(u, u);
          g.beginPath();
          g.arc(0, 0, r + 3, 0, Math.PI * 2);
          g.globalAlpha = 0.9;
          g.fillStyle = css("var(--map-pin-stroke)");
          g.fill();
          g.globalAlpha = 1;
          g.beginPath();
          g.arc(0, 0, r, 0, Math.PI * 2);
          g.fillStyle = "#111827";
          g.fill();
          g.lineWidth = on ? 2.5 : 1.5;
          g.strokeStyle = on ? css("var(--accent)") : "#fff";
          g.stroke();
          const k = r * 0.45;
          g.beginPath();
          g.moveTo(-k, -k);
          g.lineTo(k, k);
          g.moveTo(k, -k);
          g.lineTo(-k, k);
          g.lineWidth = 1.4;
          g.strokeStyle = "#fff";
          g.stroke();
        },
      });
    }
    // 나라 이름(굵기 600, 테두리 3 × (1/배율) 지도 단위)
    for (const l of polityLabels(polities, nameOf, zoom, project))
      out.push({
        kind: "text",
        x: l.x,
        y: l.y,
        layer: 1,
        grows: true,
        text: l.text,
        size: l.size * px,
        weight: 600,
        fill: "var(--map-label)",
        halo: (3 * u) / 1.2,
        haloColor: "var(--map-label-halo)",
        align: "center",
      });
    return out;
  }, [frame, zoom, battles, selected, polities, nameOf]);

  return (
    <>
      <div
        {...hostProps}
        role="img"
        aria-label={`${campaignTitle(c, locale)} - ${formatTime(t, c.unit, locale)}`}
      >
        <GlCanvas
          ref={canvasRef}
          getView={getView}
          land={land}
          areas={areas}
          borderWidth={0.5}
          lines={NO_LINES}
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
