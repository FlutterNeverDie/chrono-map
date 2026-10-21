import type { GlSprite } from "./renderer";
import { cssValue } from "./shapes";

/**
 * 글자 판(atlas): 지도 위 글자·표식을 브라우저 글꼴·canvas로 그려 WebGL 그림(sprite)으로 붙인다.
 * 본 지도(나라 이름·+N 표·말풍선)와 주제·전쟁 지도(항목 점·전투 표시·이름)가 같이 쓴다.
 *
 * 그릴 것 하나(AtlasSpec)는 지도 좌표 기준점(x, y)과 그 둘레 사각형(화면 px):
 * - text: 글자(테두리 먼저 그리고 글자 - svg paint-order stroke와 같음). dx·dy는 기준점에서 글자선 기준점까지(px)
 * - shape: 직접 그리는 그림(draw는 사각형 왼쪽 위가 원점, 1 = 화면 1px). key가 같으면 한 번만 그려 같이 쓴다(같은 모양 점 수백 개)
 * grows: 확대하는 동안 글자처럼 자란다(나라 이름 - 렌더러 u_labelScale), 아니면 화면 크기 고정(핀 크기).
 * layer: 그리는 순서(작을수록 아래). 층이 바뀌면 새 장에서 시작한다 - 렌더러가 장 순서대로 그린다(key는 한 층 안에서만 같이 쓴다).
 */
export type AtlasSpec =
  | {
      kind: "text";
      x: number;
      y: number;
      layer: number;
      grows: boolean;
      text: string;
      /** 글자 크기(px)·굵기 */
      size: number;
      weight: number;
      /** 글자·테두리 색(CSS, var(--x) 가능), 테두리 굵기(px) */
      fill: string;
      halo: number;
      haloColor: string;
      align: "center" | "left" | "right";
      dx?: number;
      dy?: number;
      alpha?: number;
    }
  | {
      kind: "shape";
      x: number;
      y: number;
      layer: number;
      key?: string;
      /** 기준점에서 사각형 왼쪽 위(px)·크기(px) */
      ox: number;
      oy: number;
      w: number;
      h: number;
      /** css: var(--x)를 지금 테마 값으로, family: 지도 글꼴 */
      draw: (
        g: CanvasRenderingContext2D,
        css: (v: string) => string,
        family: string,
      ) => void;
    };

type Item = {
  w: number;
  h: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
  grows: boolean;
  layer: number;
  /** 같은 그림을 이미 그린 항목 번호(그 자리를 같이 쓴다) */
  same?: number;
  draw: (g: CanvasRenderingContext2D) => void;
};

/**
 * 글자 판을 2048×256 여러 장으로 만든다(한 장이 크면 GPU로 올리는 프레임이 멈춰 - 렌더러가 한 프레임에 한 장씩 올린다).
 * 6ms마다 브라우저에 차례를 넘기고(이름 90개를 재고 그리는 데 한 번에 60ms가 넘어 손을 뗀 뒤 한 프레임이 멈췄다), cancelled면 버린다.
 * CPU 쪽 canvas(willReadFrequently) - GPU canvas면 WebGL로 올릴 때 GPU에서 다시 읽어 와 그 프레임이 멈췄다
 */
export async function buildAtlas(
  el: Element,
  specs: AtlasSpec[],
  cancelled: () => boolean,
): Promise<{ pages: HTMLCanvasElement[]; sprites: GlSprite[] } | null> {
  let t0 = performance.now();
  const breathe = async () => {
    if (performance.now() - t0 < 6) return;
    await new Promise((r) => setTimeout(r, 0));
    t0 = performance.now();
  };
  const css = (v: string) => cssValue(el, v);
  const family = getComputedStyle(el).fontFamily;
  const dpr = devicePixelRatio || 1;
  const W = 2048;
  const PAGE_H = 256;
  const measure = document.createElement("canvas").getContext("2d")!;
  const ordered = specs
    .map((s, i) => [s, i] as const)
    .sort((a, b) => a[0].layer - b[0].layer || a[1] - b[1])
    .map(([s]) => s);
  const items: Item[] = [];
  const keys = new Map<string, number>();
  for (const s of ordered) {
    await breathe();
    if (cancelled()) return null;
    if (s.kind === "shape") {
      const same = s.key === undefined ? undefined : keys.get(s.key);
      if (s.key !== undefined && same === undefined)
        keys.set(s.key, items.length);
      items.push({
        w: s.w,
        h: s.h,
        ox: s.ox,
        oy: s.oy,
        x: s.x,
        y: s.y,
        grows: false,
        layer: s.layer,
        same,
        draw: (g) => s.draw(g, css, family),
      });
      continue;
    }
    const font = `${s.weight} ${s.size}px ${family}`;
    measure.font = font;
    // 그릴 때와 같은 정렬로 재야 왼쪽·오른쪽 폭이 기준점 기준이 된다
    measure.textAlign = s.align;
    measure.textBaseline = "alphabetic";
    const m = measure.measureText(s.text);
    const pad = s.halo / 2 + 2;
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    const left = m.actualBoundingBoxLeft;
    const right = m.actualBoundingBoxRight;
    items.push({
      w: left + right + pad * 2,
      h: asc + desc + pad * 2,
      // 기준점(글자선 - svg text-anchor)에서 사각형 왼쪽 위
      ox: (s.dx ?? 0) - left - pad,
      oy: (s.dy ?? 0) - asc - pad,
      x: s.x,
      y: s.y,
      grows: s.grows,
      layer: s.layer,
      draw: (g) => {
        g.font = font;
        g.textAlign = s.align;
        g.textBaseline = "alphabetic";
        g.globalAlpha = s.alpha ?? 1;
        if (s.halo > 0) {
          g.lineWidth = s.halo;
          g.strokeStyle = css(s.haloColor);
          g.strokeText(s.text, pad + left, asc + pad);
        }
        g.fillStyle = css(s.fill);
        g.fillText(s.text, pad + left, asc + pad);
      },
    });
  }
  const pages: { w: number; h: number }[] = [];
  let x = 0;
  let y = 0;
  let row = 0;
  const placed: { page: number; x: number; y: number }[] = [];
  items.forEach((it, k) => {
    if (it.same !== undefined) {
      placed.push(placed[it.same]);
      return;
    }
    const w = Math.min(W, Math.ceil(it.w * dpr) + 2);
    const h = Math.min(PAGE_H, Math.ceil(it.h * dpr) + 2);
    const newLayer = k > 0 && items[k - 1].layer !== it.layer;
    if (!pages.length || x + w > W) {
      x = 0;
      y += row;
      row = 0;
    }
    if (!pages.length || y + h > PAGE_H || newLayer) {
      pages.push({ w: W, h: 0 });
      x = 0;
      y = 0;
      row = 0;
    }
    placed.push({ page: pages.length - 1, x, y });
    x += w;
    row = Math.max(row, h);
    pages[pages.length - 1].h = Math.max(pages[pages.length - 1].h, y + row);
  });
  const canvases = pages.map((pg) => {
    const c = document.createElement("canvas");
    c.width = pg.w;
    c.height = Math.max(1, pg.h);
    return c;
  });
  const ctxs = canvases.map((c) =>
    c.getContext("2d", { willReadFrequently: true })!,
  );
  const sprites: GlSprite[] = [];
  for (let i = 0; i < items.length; i++) {
    await breathe();
    if (cancelled()) return null;
    const it = items[i];
    const at = placed[i];
    if (it.same === undefined) {
      const g = ctxs[at.page];
      g.save();
      g.translate(at.x + 1, at.y + 1);
      g.scale(dpr, dpr);
      it.draw(g);
      g.restore();
    }
    sprites.push({
      x: it.x,
      y: it.y,
      page: at.page,
      rect: [it.ox, it.oy, it.w, it.h],
      src: [at.x + 1, at.y + 1, it.w * dpr, it.h * dpr],
      grows: it.grows,
    });
  }
  return { pages: canvases, sprites };
}
