import {
  labelCandidates,
  polityColor,
  type Polity,
  type PolityProps,
} from "@/components/map";
import { hasSides, sideOf } from "./logic";
import type { Battle, Campaign, SideKey } from "./types";

/** svg·WebGL 전쟁 지도가 같이 쓰는 그림 규칙(색·크기·이름 자리) */
const SIDE_FILL: Record<SideKey, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
  n: "var(--side-n)",
};
/** 나라 색과 진하기: 진영이 있으면 진영 색(기타는 옅게), 없으면 나라별 색 */
export function polityFill(
  c: Campaign,
  p: PolityProps,
  t: number,
): [string, number] {
  if (!hasSides(c)) return [polityColor(p.n), 0.45];
  const side = sideOf(c, p.n, t);
  return [SIDE_FILL[side], side === "n" ? 0.35 : 0.6];
}
/** 전투 점 반지름(핀 그림 단위) - 많이 알려진 전투(위키백과 링크 수)일수록 크게 */
export const battleRadius = (b: Battle) =>
  b.links >= 60 ? 7 : b.links >= 30 ? 5.5 : 4.5;

const round2 = (v: number) => Math.round(v * 100) / 100;
/**
 * 나라 이름 자리(svg·WebGL 지도 공통): 확대할수록 작은 나라도, 큰 나라부터 놓고 겹치면 뺀다.
 * size는 지도 단위 글자 크기(배율^-0.8 - 확대하면 화면에서 배율^0.2만큼 커진다)
 */
export function polityLabels(
  polities: Polity[],
  nameOf: (p: PolityProps) => string,
  zoom: number,
  project: (c: [number, number]) => readonly [number, number] | null,
) {
  const unit = 1 / zoom;
  const minArea = 150_000 / (zoom * zoom);
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
      const at = project(p.properties.l!);
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
}
