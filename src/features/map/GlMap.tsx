"use client";

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import type { Feature, FeatureCollection } from "geojson";
import {
  MapRenderer,
  type GlPin,
  type GlView,
} from "@/components/map/gl/renderer";
import { projectLines } from "@/components/map/gl/polygons";
import {
  cssColor,
  glProjection as projection,
  hit,
  landPieces,
  merge,
  readTheme,
  shapeAll,
  shapeAllOffThread,
  shapeFor,
} from "@/components/map/gl/shapes";
import { buildAtlas, type AtlasSpec } from "@/components/map/gl/atlas";
import { polityColor } from "@/components/map/polityColor";
import { MAP_HEIGHT, MAP_WIDTH, graticule } from "./baseMap";
import type { Polity } from "./borders";
import { BADGE, badgeWidth } from "./pinBadge";

/**
 * 본 지도 WebGL 판(주소에 ?gl). 바다·경위선·땅·나라 색·국경선·해안선 + 핀·나라 이름·고른 사건 말풍선을 그린다.
 * 화면(경도·배율·기울기·방향)은 WorldMap의 ref 값을 그대로 읽어(getView) 손짓 중에도 같은 화면을 그린다.
 * 나라 이름·말풍선은 브라우저 글꼴로 글자 판(canvas)에 그려 붙인다 - 글꼴·크기·테두리·겹침 정리(placedLabels)는 svg 때와 같다.
 */
export type GlMapHandle = {
  request: () => void;
  /** 지도 좌표(경도 0 기준, 0~MAP_WIDTH)의 나라 이름 - 맨 위에 그려진 나라, 해안선 밖이면 null(svg 누르기와 같게) */
  polityAt: (x: number, y: number) => string | null;
};
export type GlLabel = { x: number; y: number; fontSize: number; text: string };
/** 고른 사건 말풍선. photo가 있으면 핀 자리에 둥근 사진(지름 PHOTO px, 지역 색 테두리)을 얹고 말풍선은 그 위로 */
export type GlBubble = {
  x: number;
  y: number;
  title: string;
  photo?: { src: string; color: string };
};
/** 고른 핀 사진 지름(화면 px) */
export const PHOTO = 44;

/** 묶인 핀 수 "+N"(svg와 같은 모양, pinBadge.ts) - 핀 그림 단위 u px */
function badgeSpec(
  b: { x: number; y: number; more: number },
  u: number,
): AtlasSpec {
  const w = badgeWidth(b.more);
  return {
    kind: "shape",
    x: b.x,
    y: b.y,
    layer: 2,
    key: `+${b.more}`,
    w: w * u + 2,
    h: BADGE.h * u + 2,
    ox: BADGE.x * u - 1,
    oy: (BADGE.y - BADGE.h / 2) * u - 1,
    draw: (g, css, family) => {
      g.beginPath();
      g.roundRect(1, 1, w * u, BADGE.h * u, (BADGE.h / 2) * u);
      g.fillStyle = css("var(--foreground)");
      g.fill();
      g.font = `700 ${BADGE.font * u}px ${family}`;
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      g.fillStyle = css("var(--background)");
      g.fillText(
        `+${b.more}`,
        1 + (w * u) / 2,
        1 + (BADGE.h / 2 + BADGE.font * 0.36) * u,
      );
    },
  };
}
/** 고른 핀 사진: 둥글게 자르고 지역 색 테두리(2.5px) + 바깥 얇은 밝은 테두리(어두운 지도에서도 보이게) */
function photoSpec(b: GlBubble, img: HTMLImageElement): AtlasSpec {
  const w = PHOTO + 6;
  return {
    kind: "shape",
    x: b.x,
    y: b.y,
    layer: 3,
    w,
    h: w,
    ox: -w / 2,
    oy: -w / 2,
    draw: (g, css) => {
      const c = w / 2;
      g.beginPath();
      g.arc(c, c, PHOTO / 2 + 2, 0, Math.PI * 2);
      g.fillStyle = css("var(--map-pin-stroke)");
      g.fill();
      g.beginPath();
      g.arc(c, c, PHOTO / 2, 0, Math.PI * 2);
      g.fillStyle = b.photo!.color;
      g.fill();
      g.save();
      g.beginPath();
      g.arc(c, c, PHOTO / 2 - 2.5, 0, Math.PI * 2);
      g.clip();
      const d = PHOTO - 5;
      g.drawImage(img, c - d / 2, c - d / 2, d, d);
      g.restore();
    },
  };
}
/** 고른 사건 말풍선(svg와 같은 모양): 핀 그림 단위로 가로 = 글자 폭 어림 + 14, 세로 20, 위로 33, 둥글기 6, 글자 12 굵게 */
function bubbleSpec(bubble: GlBubble, u: number, photo: boolean): AtlasSpec {
  const wUnits =
    [...bubble.title].reduce(
      (w, ch) => w + (ch.codePointAt(0)! >= 0x2e80 ? 12 : 7.2),
      0,
    ) + 14;
  return {
    kind: "shape",
    x: bubble.x,
    y: bubble.y,
    layer: 4,
    w: wUnits * u + 2,
    h: 20 * u + 2,
    ox: (-wUnits / 2) * u - 1,
    // 사진이 있으면 사진 위 끝에서 4px 위로
    oy: photo ? -PHOTO / 2 - 4 - 20 * u - 1 : -33 * u - 1,
    draw: (g, css, family) => {
      g.beginPath();
      g.roundRect(1, 1, wUnits * u, 20 * u, 6 * u);
      g.fillStyle = css("var(--surface)");
      g.fill();
      g.lineWidth = u;
      g.strokeStyle = css("var(--line)");
      g.stroke();
      g.font = `700 ${12 * u}px ${family}`;
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      g.fillStyle = css("var(--map-label)");
      g.fillText(bubble.title, 1 + (wUnits * u) / 2, 1 + 14 * u);
    },
  };
}

export function GlMap({
  ref,
  getView,
  polities,
  land,
  selected,
  pins,
  labels,
  bubble,
  zoom,
  frameH,
  onFail,
}: {
  ref: Ref<GlMapHandle>;
  getView: { current: () => GlView | null };
  polities: Polity[];
  land: FeatureCollection | Feature;
  selected: string | null;
  /** 핀(svg 핀과 같은 순서 - 뒤의 것이 위), 색은 CSS 색 */
  /** more: 이 핀에 묶인 다른 핀 수("+N" 표) */
  pins: {
    x: number;
    y: number;
    color: string;
    selected: boolean;
    more: number;
  }[];
  labels: GlLabel[];
  bubble: GlBubble | null;
  /** 지금 그린 배율(글자 판 크기 기준) */
  zoom: number;
  /** 지도 칸 높이(px) - 지도 1단위 = zoom × frameH / MAP_HEIGHT px */
  frameH: number;
  /** WebGL을 만들 수 없음(svg 지도로 바꾼다) */
  onFail: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const landShapes = useRef<ReturnType<typeof shapeFor>[]>([]);
  const polityShapes = useRef<{ n: string; s: ReturnType<typeof shapeFor> }[]>(
    [],
  );
  /** 테마·나라 이름 숨기기·글꼴이 바뀐 횟수(글자 판을 다시 그리게) */
  const [look, setLook] = useState(0);
  /** WebGL 연결을 새로 만든 횟수 - 아이폰은 앱을 바꿨다 오면 연결이 끊길 수 있어, 돌아오면 새로 만들고 자료를 다시 올린다 */
  const [gen, setGen] = useState(0);
  const failRef = useRef(onFail);
  useEffect(() => {
    failRef.current = onFail;
  });
  useImperativeHandle(
    ref,
    () => ({
      request: () => renderer.current?.request(),
      polityAt: (x, y) => {
        const mx = ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
        if (!landShapes.current.some((s) => hit(s, mx, y))) return null;
        for (let i = polityShapes.current.length - 1; i >= 0; i--)
          if (hit(polityShapes.current[i].s, mx, y))
            return polityShapes.current[i].n;
        return null;
      },
    }),
    [],
  );

  useEffect(() => {
    const el = canvas.current!;
    let r: MapRenderer;
    try {
      r = new MapRenderer(el, MAP_WIDTH, MAP_HEIGHT);
    } catch {
      failRef.current();
      return;
    }
    renderer.current = r;
    const lost = (e: Event) => {
      // 기본 동작(연결을 영영 버림)을 막아야 다시 살아난다
      e.preventDefault();
      renderer.current = null;
    };
    const restored = () => setGen((n) => n + 1);
    el.addEventListener("webglcontextlost", lost);
    el.addEventListener("webglcontextrestored", restored);
    r.setViewSource(() => getView.current());
    r.setGraticule(projectLines(projection, graticule));
    // 테마·나라 이름 숨기기 등 html 속성이 바뀌면 색·글자를 다시
    const theme = () => {
      r.setTheme(readTheme(el));
      setLook((n) => n + 1);
    };
    theme();
    const mo = new MutationObserver(theme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-scene-theme", "data-names"],
    });
    // 글꼴(웹 글꼴)을 다 받으면 글자 판을 다시
    document.fonts?.ready.then(() => setLook((n) => n + 1));
    return () => {
      mo.disconnect();
      el.removeEventListener("webglcontextlost", lost);
      el.removeEventListener("webglcontextrestored", restored);
      r.destroy();
      renderer.current = null;
    };
  }, [getView, gen]);

  // 해안선도 여러 프레임에 나눠 삼각형으로(확대하면 받는 50m는 점 5만 개 - 한 번에 하면 처음 확대할 때 멈칫했다).
  // 다각형 하나씩 계산하고, 다 될 때까지 전 해안선(110m)을 그대로 그린다
  useEffect(
    () =>
      shapeAllOffThread(landPieces(land), (list) => {
        landShapes.current = list;
        renderer.current?.setLand(list);
      }),
    [land, gen],
  );

  // 국경 삼각형은 여러 프레임에 나눠 계산한다(연도를 바꾸면 수백 개 - 휴대폰에서 한 번에 하면 슬라이더가 멈칫했다).
  // 다 될 때까지 전 연도 국경을 그대로 그린다
  useEffect(
    () =>
      shapeAll(polities, (list) => {
        polityShapes.current = polities.map((p, i) => ({
          n: p.properties.n,
          s: list[i],
        }));
        renderer.current?.setPolities(
          polities.map((p, i) => ({
            shape: list[i],
            color: cssColor(polityColor(p.properties.w ?? p.properties.n)),
          })),
        );
      }),
    [polities, gen],
  );

  useEffect(() => {
    const pick = selected
      ? polities.filter((p) => p.properties.n === selected)
      : [];
    renderer.current?.setSelected(
      pick.length
        ? {
            shape: merge(pick.map(shapeFor)),
            color: cssColor(
              polityColor(pick[0].properties.w ?? pick[0].properties.n),
            ),
          }
        : null,
    );
  }, [selected, polities, gen]);

  const lastSelected = useRef<number>(-1);
  useEffect(() => {
    const sel = pins.findIndex((p) => p.selected);
    const list: GlPin[] = pins.map((p) => ({
      x: p.x,
      y: p.y,
      color: cssColor(p.color),
      selected: p.selected,
    }));
    renderer.current?.setPins(list, sel >= 0 && sel !== lastSelected.current);
    lastSelected.current = sel;
  }, [pins, gen]);

  // 고른 사건 사진: 받은 뒤 글자 판에 넣는다(그 전엔 보통 핀)
  const photoSrc = bubble?.photo?.src;
  const [photo, setPhoto] = useState<{
    src: string;
    img: HTMLImageElement;
  } | null>(null);
  useEffect(() => {
    if (!photoSrc) return;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => setPhoto({ src: photoSrc, img });
    img.src = photoSrc;
    return () => {
      img.onload = null;
    };
  }, [photoSrc]);
  const photoImg = photo && photo.src === photoSrc ? photo.img : null;
  const badges = useMemo(() => pins.filter((p) => p.more > 0), [pins]);
  // 글자 판: 처음(또는 연결을 새로 만든 뒤)은 바로, 그다음부터는 이번 화면을 그린 뒤에 - 손을 뗀 직후 한 번 그리는 프레임이
  // 무거워 멈칫했다. 그사이에는 전 글자 판을 배율만큼 키워 그린다
  // 글자 판: 화면을 그린 뒤 쉬어 가며 만들고(buildAtlas), 그사이에는 전 글자 판을 배율만큼 키워 그린다.
  // 새 화면이 오면 만들던 것은 버린다
  useEffect(() => {
    const el = canvas.current;
    if (!el || !frameH) return;
    let cancelled = false;
    const frame = requestAnimationFrame(async () => {
      const px = (zoom * frameH) / MAP_HEIGHT;
      const pinPx = (1.2 * frameH) / MAP_HEIGHT;
      const names = document.documentElement.dataset.names !== "off";
      // 나라 이름(굵기 600, 크기 fontSize 지도 단위 × px, 테두리 3 × (1/배율) 지도 단위 = 3 × 핀px/1.2) → +N 표 → 말풍선
      const specs: AtlasSpec[] = [
        ...(names ? labels : []).map((l): AtlasSpec => ({
          kind: "text",
          x: l.x,
          y: l.y,
          layer: 1,
          grows: true,
          text: l.text,
          size: l.fontSize * px,
          weight: 600,
          fill: "var(--map-label)",
          halo: (3 * pinPx) / 1.2,
          haloColor: "var(--map-label-halo)",
          align: "center",
        })),
        ...badges.map((b) => badgeSpec(b, pinPx)),
        ...(bubble && photoImg ? [photoSpec(bubble, photoImg)] : []),
        ...(bubble ? [bubbleSpec(bubble, pinPx, !!photoImg)] : []),
      ];
      const built = await buildAtlas(el, specs, () => cancelled);
      if (built && !cancelled)
        renderer.current?.setSprites(built.pages, built.sprites, zoom);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [labels, badges, bubble, photoImg, zoom, frameH, look, gen]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}
