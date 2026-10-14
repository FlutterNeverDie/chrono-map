"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  polityColor,
  useMapViewport,
  usePolities,
  usePolityNames,
  labelCandidates,
  type PolityProps,
} from "@/components/map";
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
import type { SideKey } from "./types";

const SIDE_FILL: Record<SideKey, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
  n: "var(--side-n)",
};
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * 전쟁 지도: 그 시점의 진영별 영토(진영이 없으면 나라별 색) + 진행 중인 전투.
 * 지도 조작(끌기·확대·이동)은 공용 useMapViewport.
 */
export function CampaignMap() {
  const { locale } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const selected = useCampaignState((s) => s.selectedBattle);
  const selectBattle = useCampaignState((s) => s.selectBattle);
  const focus = useCampaignState((s) => s.focus);
  const vp = useMapViewport(c.view);
  const year = yearOf(t, c.unit);
  const snapshot = c.borderYears.reduce(
    (pick, y) => (y <= year ? y : pick),
    c.borderYears[0],
  );
  const polities = usePolities(`/campaigns/${c.id}/borders/${snapshot}.json`);
  const nameOf = usePolityNames(locale);
  const sided = hasSides(c);

  useEffect(() => {
    if (focus) return vp.focusTo(focus.coords, c.view.zoom * 1.6);
    // 같은 요청(nonce)마다 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const battles = useMemo(() => battlesAt(c, t), [c, t]);
  const unit = 1 / vp.zoom;
  const fillOf = (p: PolityProps): [string, number] => {
    if (!sided) return [polityColor(p.n), 0.45];
    const side = sideOf(c, p.n, t);
    return [SIDE_FILL[side], side === "n" ? 0.35 : 0.6];
  };

  // 이름: 확대할수록 작은 나라도, 겹치면 뺀다
  const labels = (() => {
    const minArea = 150_000 / (vp.zoom * vp.zoom);
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const out: {
      key: string;
      x: number;
      y: number;
      size: number;
      text: string;
    }[] = [];
    labelCandidates(polities, nameOf)
      .filter(({ polity }) => polity.properties.a >= minArea)
      .forEach(({ polity: p, text }, i) => {
        const at = vp.project(p.properties.l!);
        if (!at) return;
        const size = round2(
          Math.min(14, 8.5 + Math.log10(p.properties.a / 150_000 + 1) * 4) *
            Math.pow(unit, 0.8),
        );
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
      {...vp.svgProps((target) => {
        const id = target.closest("[data-battle]")?.getAttribute("data-battle");
        if (id) selectBattle(id);
      })}
      role="img"
      aria-label={`${campaignTitle(c, locale)} — ${formatTime(t, c.unit, locale)}`}
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
            <clipPath id={`war-land-${copy}`}>
              <path d={vp.landD} />
            </clipPath>
          </defs>
          <path d={vp.landD} fill="var(--map-land)" />
          <g
            clipPath={`url(#war-land-${copy})`}
            stroke="var(--map-border)"
            strokeWidth={0.5}
            strokeLinejoin="round"
          >
            {polities.map((p, i) => {
              const [fill, opacity] = fillOf(p.properties);
              return (
                <path
                  key={`${p.properties.n}-${i}`}
                  d={vp.path(p) ?? ""}
                  fill={fill}
                  vectorEffect="non-scaling-stroke"
                  style={{ fillOpacity: opacity }}
                />
              );
            })}
          </g>
          <path
            d={vp.landD}
            fill="none"
            stroke="var(--map-border)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />

          {battles.map((b) => {
            const at = vp.project(b.coords);
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
            className="map-names pointer-events-none"
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
