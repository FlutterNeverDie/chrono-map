"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { geoPath } from "d3-geo";
import { usePeriod } from "@/store/timeline";
import { MAX_ZOOM, useUi } from "@/store/ui";
import { useVisibleEvents } from "@/store/useVisibleEvents";
import { limitPins } from "@/lib/events";
import { eventTitle } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { formatPeriod } from "@/lib/period";
import { REGION_BY_ID } from "@/data/regions";
import {
  VIEWPOINT_BY_ID,
  homeRegion,
  homeViewpoint,
  zoneViewpoint,
} from "@/data/viewpoints";
import { rasterizeSvg } from "@/components/map/snapshot";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  graticule,
  land,
  loadDetailedLand,
  makeProjection,
  normalizeLon,
} from "./baseMap";
import { useBorders, type PolityProps } from "./borders";
import { useHydrated } from "@/components/map/useHydrated";
import { swallowNextClick } from "@/components/map/ghostClick";
import { mapCover, useMapCover } from "@/components/map/mapCover";

/** 이 픽셀보다 적게 움직이면 끌기가 아니라 탭으로 본다 */
const TAP_SLOP = 5;
/** 배율 1에서 이름을 표시할 최소 면적(km²). 확대할수록 작은 나라도 표시 */
const LABEL_MIN_AREA = 200_000;
/** 배율 1에서 이름표 최대 개수(이름 수). 현대 지도는 나라가 80개 넘게 커서 영국(약 26만 km², 76위)도 들어가게 - 겹치는 이름은 배치에서 빠지므로 빽빽해지지 않는다 */
const MAX_LABELS = 90;

/** 정치체마다 고정된 색 (Wikidata ID/이름 해시) */
const POLITY_COLORS = [
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
function polityColor(p: PolityProps): string {
  const key = p.w ?? p.n;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return POLITY_COLORS[Math.abs(h) % POLITY_COLORS.length];
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

type Gesture = {
  /** 한 손가락/마우스: 끌기 시작 시점의 값 */
  x: number;
  y: number;
  lon: number;
  centerY: number;
  moved: boolean;
  eventId: string | null;
  polity: string | null;
  /** 두 손가락: 핀치 시작 거리와 배율 */
  pinch?: { dist: number; zoom: number };
  /** 누를 때 지도 그림 미리보기 중이었음(svg가 보이는 자리에 없어 누른 핀·나라는 그린 뒤 다시 찾는다) */
  stale?: boolean;
  /** 끌기 속도 계산용 최근 위치(시각 ms, x, y) */
  samples?: [number, number, number][];
};

/**
 * 지도 그림(snapshot)을 구울 복제본 손질: 넓힌 범위(x ~ x + w)를 덮도록 바다 사각형을 늘리고 지도 복사본(경도 한 바퀴씩)을 더 붙인다.
 * 나라 이름을 숨겼으면 빼고, 고른 핀 물결(움직이는 것)도 뺀다. 복사본은 svg 바로 아래 `<g transform="translate(o 0)">`.
 */
function extendCopies(clone: SVGSVGElement, x: number, w: number) {
  const ocean = clone.querySelector(":scope > rect");
  ocean?.setAttribute("x", String(x));
  ocean?.setAttribute("width", String(w));
  if (document.documentElement.dataset.names === "off")
    clone.querySelectorAll(".map-names").forEach((n) => n.remove());
  clone.querySelectorAll(".animate-pin-pulse").forEach((n) => n.remove());
  // 복사본은 한 장만 남기고 나머지는 그 한 장을 가리키는 <use>로 - 글자로 바꾸는(serialize) 양이 복사본 수만큼 줄어든다
  // (굽기에서 가장 무거운 단계였다: 크롬 CPU 4배 느림에서 글자 바꾸기 95ms + 이미지 파일 만들기 86ms)
  const copies = [...clone.querySelectorAll(":scope > g")];
  const first = copies[0];
  if (!first) return;
  const offsetOf = (g: Element) =>
    Number(/translate\(([-\d.]+)/.exec(g.getAttribute("transform") ?? "")?.[1]);
  const base = offsetOf(first);
  copies.slice(1).forEach((g) => g.remove());
  first.setAttribute("id", "copy");
  for (let k = -4; k <= 4; k++) {
    const o = round1(base + k * MAP_WIDTH);
    if (k === 0 || o >= x + w || o + MAP_WIDTH <= x) continue;
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#copy");
    use.setAttribute("transform", `translate(${round1(o - base)} 0)`);
    clone.appendChild(use);
  }
}

/**
 * 지도 위에 떠 있는 것(데스크톱 오른쪽 패널 / 모바일 아래 시트 / 위 제목 상자)에 가려지지 않은 영역의 가운데가 지도 가운데에서 얼마나 떨어졌는지(px).
 * 패널이 오른쪽(보통)이면 x > 0, 왼쪽(아랍어 RTL)이면 x < 0. 세로는 (아래 덮인 높이 - 위 덮인 높이) / 2
 */
function overlayOffset(svg: SVGSVGElement): { x: number; y: number } {
  // 확대 미리보기 변환이 걸려 있을 수 있어 변환 없는 부모(지도 칸) 기준
  const rect = (svg.parentElement ?? svg).getBoundingClientRect();
  const { top, bottom } = mapCover(svg);
  const y = (bottom - top) / 2;
  const panel = document
    .querySelector("[data-map-overlay]")
    ?.getBoundingClientRect();
  if (!panel || panel.height <= 0 || panel.width >= rect.width * 0.8)
    return { x: 0, y };
  return {
    x:
      panel.left > rect.left + rect.width / 2
        ? (rect.right - panel.left) / 2
        : -(panel.right - rect.left) / 2,
    y,
  };
}

/**
 * 하단 바 위 영역을 모두 덮는 평면 세계지도.
 * - 나라 영역·이름은 선택 연도의 역사 국경(borders.ts)
 * - 가로: 지구를 돌리듯 끝없이 이어진다(회전). 세로: 확대했을 때만 움직인다
 * - 확대: 휠, 두 손가락 핀치, 두 번 클릭
 * - 나라를 누르면 강조하고 이름을 항상 보여준다. 다시 누르면 해제
 */
export function WorldMap() {
  const { locale, messages } = useI18n();
  // 첫 시점은 언어별(homeViewpoint). 아래 useUi 읽기·목록 정렬보다 먼저 저장소에 넣는다
  const [startLon] = useState(() => {
    const home = homeViewpoint(locale);
    useUi.getState().initViewpoint(home);
    return VIEWPOINT_BY_ID.get(home)!.lon;
  });
  const period = usePeriod();
  const viewpoint = useUi((s) => s.viewpoint);
  const setViewpoint = useUi((s) => s.setViewpoint);
  const setCenterLon = useUi((s) => s.setCenterLon);
  const zoom = useUi((s) => s.zoom);
  const setZoom = useUi((s) => s.setZoom);
  const selectFromMap = useUi((s) => s.selectFromMap);
  const focusOn = useUi((s) => s.focusOn);
  const selectedEventId = useUi((s) => s.selectedEventId);
  const { polities, nameOf } = useBorders(period.start, locale);

  const svgRef = useRef<SVGSVGElement>(null);
  const [lon, setLon] = useState(startLon);
  const [centerY, setCenterY] = useState(MAP_HEIGHT / 2);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [selectedPolity, setSelectedPolity] = useState<string | null>(null);
  const lonRef = useRef(startLon);
  const centerYRef = useRef(MAP_HEIGHT / 2);
  /** 실제 배율(확대 중에는 아직 화면에 반영하지 않은 값까지). 확대 계산은 저장소 값이 아니라 이것을 기준으로 */
  const zoomRef = useRef(zoom);
  /** 마지막으로 그린 화면(viewBox·경도) - 확대 미리보기 변환의 기준 */
  const rendered = useRef<{
    lon: number;
    v: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const commitTimer = useRef(0);
  /** 미리보기 중 지도 칸 크기(처음 한 번만 잼) - 손가락이 움직일 때마다 재면 방금 바꾼 변환 때문에 브라우저가 레이아웃을 강제로 다시 한다 */
  const previewRect = useRef<DOMRect | null>(null);
  /** 미리보기 변환 쓰기는 한 프레임에 한 번(두 손가락이면 움직임 이벤트가 프레임마다 두 번 온다) */
  const previewFrame = useRef(0);
  /** 휴대폰용 지도 그림(snapshot): 마지막으로 그린 화면을 좌우 한 화면·위아래 반 화면씩 넓게 구운 canvas. key가 지금 그린 화면 번호와 같을 때만 쓴다 */
  const snapHost = useRef<HTMLDivElement>(null);
  const snap = useRef<{
    key: number;
    /** 구울 때의 큰 내용 번호(major) */
    major: number;
    w: number;
    h: number;
    /** 구울 때의 화면(경도·viewBox) - 미리보기 변환의 기준 */
    r: { lon: number; v: { x: number; y: number; w: number; h: number } };
  } | null>(null);
  /** 확대·이동을 그리는 중(그때 바뀌는 svg는 내용 변화가 아니라 화면 변화 - 구운 그림을 버리지 않는다) */
  const viewCommit = useRef(false);
  const renderKey = useRef(0);
  /**
   * 큰 내용 번호: 지도가 실제로 달라지는 변화(연도의 국경·언어·테마·나라 이름 숨기기)에만 바뀐다.
   * 핀·나라 강조 같은 작은 변화로는 그림을 버리지 않는다 - 핀을 누른 직후 확대·끌기가 예전 방식(svg 직접 이동)으로 빠져
   * 화면 끝 빈 곳·경계선이 깜빡였다. 작은 변화는 쉴 때 다시 구우면서 반영된다
   */
  const major = useRef(0);
  // 연도의 국경·언어가 바뀌면 큰 내용 변화(구운 지도 그림을 쓰지 않는다)
  useEffect(() => {
    major.current++;
  }, [polities, locale]);
  /** 구운 지도 그림을 손짓 미리보기에 쓸 수 있는지(내용이 그대로거나 작은 변화만 있었음) */
  const snapUsable = () => {
    const s = snap.current;
    return !!s && (s.key === renderKey.current || s.major === major.current);
  };
  const snapTimer = useRef(0);
  /** commitZoom(아래에서 만듦)을 미리보기에서 부르기 위한 ref */
  const commitRef = useRef(() => {});
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  /** 두 번 탭 판정용: 마지막 탭(시각·위치), 손가락 두 번 탭으로 확대한 시각(뒤따르는 dblclick 무시) */
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const touchZoomAt = useRef(0);
  /** 손을 뗀 뒤 그리기 예약(연달아 움직이는 동안은 그림만 옮기고 쉴 때 한 번 그린다) */
  const settleTimer = useRef(0);
  /** 관성 이동 애니메이션(requestAnimationFrame id, 0이면 멈춤) */
  const momentum = useRef(0);

  const updateLon = useCallback((next: number) => {
    lonRef.current = normalizeLon(next);
    setLon(lonRef.current);
  }, []);
  const updateCenterY = useCallback((next: number) => {
    centerYRef.current = next;
    setCenterY(next);
  }, []);

  // 화면 크기: 세로(위도 전체)를 높이에 맞추고 가로는 비율만큼
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** 보이는 범위(지도 좌표). 가로는 항상 가운데 고정이고, 가로 이동은 회전(lon)으로 한다 */
  // 아래 시트(모바일 사건 목록)·위 제목 상자가 덮은 만큼은 지도를 더 옮길 수 있게 - 희망봉처럼 남쪽 끝, 북쪽 끝 사건도 가리지 않은 곳으로
  const cover = useMapCover(svgRef);
  const view = useCallback(
    (k: number, cy: number) => {
      const baseW = size ? (MAP_HEIGHT * size.w) / size.h : MAP_WIDTH;
      const w = baseW / k;
      const h = MAP_HEIGHT / k;
      const unit = size ? h / size.h : 0;
      const y = Math.min(
        MAP_HEIGHT - h + cover.bottom * unit,
        Math.max(-cover.top * unit, cy - h / 2),
      );
      return { x: (MAP_WIDTH - w) / 2, y, w, h };
    },
    [size, cover],
  );
  const v = view(zoom, centerY);

  /** 지도 화면 크기·위치. 확대 미리보기 중에는 svg에 변환이 걸려 있어서, 변환이 없는 부모(지도 칸) 기준으로 잰다 */
  const mapRect = useCallback(
    () =>
      previewRect.current ??
      svgRef.current?.parentElement?.getBoundingClientRect(),
    [],
  );

  /**
   * 확대 미리보기: 확대하는 동안에는 이미 그린 지도를 CSS transform으로 늘리고 옮기기만 하고(GPU, 다시 그리지 않음),
   * 멈추면(commitZoom) 실제 배율로 한 번 다시 그린다. viewBox 배율이 바뀌면 국경 수백 개(복사본까지)의 선 두께·모양을
   * 브라우저가 매번 다시 계산해서 휴대폰 핀치가 15~24fps로 끊겼다(CPU 4배 느림 측정, 스타일·레이아웃만 5초).
   */
  const applyPreview = useCallback(() => {
    previewFrame.current = 0;
    const svg = svgRef.current;
    const r = rendered.current;
    const rect = mapRect();
    if (!svg || !r || !rect) return;
    previewRect.current = rect;
    const vp = view(zoomRef.current, centerYRef.current);
    /** 기준 화면(base)에서 지금 화면으로 가는 변환 */
    const toNow = (base: typeof r) => {
      const dShift =
        (-normalizeLon(lonRef.current - base.lon) * MAP_WIDTH) / 360;
      return {
        scale: base.v.w / vp.w,
        tx: ((base.v.x + dShift - vp.x) * rect.width) / vp.w,
        ty: ((base.v.y - vp.y) * rect.height) / vp.h,
      };
    };
    const host = snapHost.current;
    const canvas = host?.firstElementChild as HTMLElement | null;
    const s = snap.current;
    // 손으로 움직이지 않는 이동(핀을 눌러 그 자리로 가기·휠)은 내용이 조금 지난 그림이라도 쓴다 - 핀을 누르면 강조가 바뀌어
    // 그림을 버리게 되는데, 그때 svg를 직접 옮기면 화면 끝에 지도가 없는 빈 곳과 경계선이 깜빡였다. 도착하면 진짜 지도로 바뀐다
    if (
      host &&
      canvas &&
      s &&
      (s.key === renderKey.current ||
        s.major === major.current ||
        !gesture.current) &&
      s.w === rect.width &&
      s.h === rect.height
    ) {
      // 그림은 구울 때의 화면 기준(그 뒤 확대·이동을 그렸어도 그대로 쓴다 - 연달아 확대할 때 다시 구울 때까지 기다리지 않게)
      const { scale, tx, ty } = toNow(s.r);
      // 그림이 화면을 다 덮는지(끌기로 한 화면 넘게 가면 빈 곳이 보인다) - 끌기는 넘으면 한 번 그리고 이어 간다
      const { width: W, height: H } = rect;
      const covered =
        tx - 2 * W * scale <= 1 &&
        tx + 3 * W * scale >= W - 1 &&
        ty - H * scale <= 1 &&
        ty + 2 * H * scale >= H - 1;
      if (
        covered ||
        gesture.current?.pinch ||
        (!gesture.current && !momentum.current)
      ) {
        canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        // 그림으로 바꾸는 건 처음 한 번만 - svg 속성은 같은 값을 다시 써도 WebKit이 지도 svg 전체 스타일을 다시 계산해
        // 매 프레임 쓰면 아이폰에서 끌기·확대가 무거웠다(Safari 타임라인으로 확인)
        if (host.style.visibility !== "visible") {
          host.style.visibility = "visible";
          svg.style.opacity = "0";
          svg.dataset.preview = "";
        }
        return;
      }
      // 그림 밖으로 나가면 그림을 버리고 한 번 그린 뒤 예전 방식(끌 때마다 그림)으로 이어 간다 - 쉬면 다시 굽는다
      snap.current = null;
      host.style.visibility = "hidden";
      svg.style.opacity = "";
      return commitRef.current();
    }
    if (host && host.style.visibility === "visible")
      host.style.visibility = "hidden";
    if (svg.style.opacity) svg.style.opacity = "";
    const { scale, tx, ty } = toNow(r);
    svg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    if (svg.dataset.preview === undefined) {
      svg.style.transformOrigin = "0 0";
      svg.style.willChange = "transform";
      // 고른 핀 물결이 움직이면 늘린 지도를 프레임마다 다시 그려야 해서 멈춘다
      svg.dataset.preview = "";
    }
  }, [view, mapRect]);
  /** 미리보기 예약(다음 프레임에 한 번). now면 바로(사건 고르기 이동은 이미 프레임마다 부른다) */
  const previewZoom = useCallback(
    (now?: boolean) => {
      if (now) {
        cancelAnimationFrame(previewFrame.current);
        return applyPreview();
      }
      if (!previewFrame.current)
        previewFrame.current = requestAnimationFrame(applyPreview);
    },
    [applyPreview],
  );

  /** 미리보기 중인 배율·위치를 실제로 그린다(변환은 다시 그린 직후 useLayoutEffect에서 지운다) */
  const commitZoom = useCallback(() => {
    window.clearTimeout(commitTimer.current);
    cancelAnimationFrame(previewFrame.current);
    previewFrame.current = 0;
    previewRect.current = null;
    // 화면이 실제로 바뀌면(다시 그림) 그 svg 변화는 화면 변화로 본다 - 아래 useLayoutEffect가 그린 뒤 끈다
    const r = rendered.current;
    const next = view(zoomRef.current, centerYRef.current);
    if (r && (r.lon !== lonRef.current || r.v.w !== next.w || r.v.y !== next.y))
      viewCommit.current = true;
    updateLon(lonRef.current);
    updateCenterY(centerYRef.current);
    setZoom(zoomRef.current);
  }, [setZoom, updateLon, updateCenterY, view]);
  useEffect(() => {
    commitRef.current = commitZoom;
  }, [commitZoom]);

  /** 화면 좌표(cx, cy)를 고정점으로 배율을 바꾼다. preview면 미리보기로 두고 settle(ms) 뒤에 그린다(0이면 손을 뗄 때 직접) */
  const zoomAt = useCallback(
    (nextZoom: number, cx: number, cy: number, settle?: number) => {
      const rect = mapRect();
      const k = zoomRef.current;
      const nk = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
      if (!rect || nk === k) return;
      const px = (cx - rect.left) / rect.width;
      const py = (cy - rect.top) / rect.height;
      const before = view(k, centerYRef.current);
      const mx = before.x + px * before.w;
      const my = before.y + py * before.h;
      const after = view(nk, centerYRef.current);
      // 고정점이 같은 화면 위치에 오도록: 가로는 회전, 세로는 중심 이동
      const dx = after.x + px * after.w - mx;
      lonRef.current = normalizeLon(lonRef.current - (dx * 360) / MAP_WIDTH);
      centerYRef.current = my - py * after.h + after.h / 2;
      zoomRef.current = nk;
      if (settle === undefined) return commitZoom();
      previewZoom();
      window.clearTimeout(commitTimer.current);
      if (settle > 0)
        commitTimer.current = window.setTimeout(commitZoom, settle);
    },
    [view, mapRect, previewZoom, commitZoom],
  );

  // 다시 그린 뒤: 그린 화면을 기억하고, 미리보기 변환이 남아 있으면 지운다(같은 프레임이라 깜빡이지 않음)
  useLayoutEffect(() => {
    rendered.current = { lon, v: view(zoom, centerY) };
    zoomRef.current = zoom;
    const svg = svgRef.current;
    if (svg && svg.dataset.preview !== undefined) {
      svg.style.transform = "";
      svg.style.willChange = "";
      svg.style.opacity = "";
      delete svg.dataset.preview;
      if (snapHost.current) snapHost.current.style.visibility = "hidden";
    }
    // 이번 그리기의 svg 변화(MutationObserver 기록은 이 뒤 microtask로 온다)를 본 다음 끈다
    queueMicrotask(() => {
      queueMicrotask(() => {
        viewCommit.current = false;
      });
    });
  }, [lon, centerY, zoom, view]);

  // 휴대폰: 지도 내용이 바뀌면(svg DOM 변화 - 다시 그렸는데 바뀐 게 없으면 그대로) 지도 그림을 새로 굽는다
  // (멈추고 0.5초 뒤, 확대·끌기 중이 아닐 때). 그동안 확대·끌기는 svg를 직접 옮긴다.
  // 렌더마다 버리면 끌기 시작(setViewpoint) 같은 내용 없는 렌더에도 그림을 못 써서 DOM 변화로 판단한다
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !matchMedia("(pointer: coarse)").matches) return;
    /** 움직이는 중에 내용이 바뀌었음(다음 굽기 때 지금 그림을 버린다) */
    let dirty = false;
    /** 끄는 중 곧바로 굽기 예약됨 */
    let soon = false;
    const build = async () => {
      const host = snapHost.current;
      const r = rendered.current;
      const rect = svg.parentElement?.getBoundingClientRect();
      if (!host || !r || !rect?.width) return;
      // 그림을 보여 주는 중이면 끝난 뒤에. 끄는 중이라도 그림이 없으면(그림 밖으로 나가 예전 방식으로 그리는 중) 바로 굽는다
      if (
        svg.dataset.preview !== undefined ||
        (gesture.current && snap.current)
      ) {
        snapTimer.current = window.setTimeout(build, 500);
        return;
      }
      if (dirty) {
        dirty = false;
        renderKey.current++;
      }
      const key = renderKey.current;
      const majorAtStart = major.current;
      const { width: W, height: H } = rect;
      // 그림 크기: 화면 5배 × 3배(좌우 두 화면, 위아래 한 화면 - 확대했을 때는 한 화면이 짧아 금방 그림 밖으로 나갔다).
      // 해상도는 1.5배까지, 전체 800만 화소 이하(아이폰 canvas 한도 1670만)
      const scale = Math.min(
        1.5,
        devicePixelRatio,
        Math.sqrt(8e6 / (W * 5 * H * 3)),
      );
      const canvas = await rasterizeSvg(
        svg,
        {
          x: r.v.x - 2 * r.v.w,
          y: r.v.y - r.v.h,
          w: r.v.w * 5,
          h: r.v.h * 3,
        },
        { w: W * 5, h: H * 3, scale },
        (clone) => extendCopies(clone, r.v.x - 2 * r.v.w, r.v.w * 5),
        host.querySelector("canvas") ?? undefined,
        () => svg.dataset.preview !== undefined,
      );
      if (!canvas) {
        // 굽는 사이 그림 미리보기가 시작됐으면 끝난 뒤 다시
        if (svg.dataset.preview !== undefined)
          snapTimer.current = window.setTimeout(build, 500);
        return;
      }
      if (key !== renderKey.current) return;
      Object.assign(canvas.style, {
        position: "absolute",
        left: `${-2 * W}px`,
        top: `${-H}px`,
        width: `${W * 5}px`,
        height: `${H * 3}px`,
        transformOrigin: `${2 * W}px ${H}px`,
        willChange: "transform",
      });
      if (canvas.parentElement !== host) host.replaceChildren(canvas);
      snap.current = { key, major: majorAtStart, w: W, h: H, r };
    };
    /** 확대·끌기·관성 이동 중(지도 그림을 보여 주는 중 포함) */
    const interacting = () =>
      !!gesture.current ||
      !!momentum.current ||
      snapHost.current?.style.visibility === "visible";
    /**
     * content: 내용이 바뀜(구운 그림을 버림). 화면만 바뀌었으면 그림은 두고 더 선명하게 다시 굽기만.
     * 움직이는 중의 내용 변화(끌기 시작 → 보는 지역이 바뀌어 핀 순위·목록이 바뀜 등)는 끝난 뒤로 미룬다 -
     * 바로 버리면 끌 때마다 그림을 못 쓰고 매번 다시 그리는 길로 빠졌다(아이폰 Safari 타임라인으로 확인)
     */
    /** 화면만 옮겼고(배율 그대로) 아직 그림 안쪽이면 다시 굽지 않는다 - 끌기만 하고 놓을 때마다 굽느라 멈추지 않게 */
    const stillCovers = () => {
      const s = snap.current;
      const r = rendered.current;
      if (!s || !r || Math.abs(s.r.v.w / r.v.w - 1) > 0.02) return false;
      const dx =
        ((-normalizeLon(r.lon - s.r.lon) * MAP_WIDTH) / 360 + s.r.v.x - r.v.x) /
        r.v.w;
      const dy = (s.r.v.y - r.v.y) / r.v.h;
      return Math.abs(dx) < 1 && Math.abs(dy) < 0.5;
    };
    const invalidate = (content = true) => {
      if (content) {
        if (interacting()) dirty = true;
        else renderKey.current++;
      } else if (!dirty && stillCovers()) return;
      // 끄는 중인데 그림이 없으면(그림 밖으로 나가 예전 방식) 곧바로 굽는다 - 움직일 때마다 미루면 손을 뗄 때까지 못 굽는다
      if (gesture.current && !snap.current) {
        if (!soon) {
          soon = true;
          window.clearTimeout(snapTimer.current);
          snapTimer.current = window.setTimeout(() => {
            soon = false;
            build();
          }, 60);
        }
        return;
      }
      window.clearTimeout(snapTimer.current);
      // 굽기는 화면을 잠깐 멈춘다(WebKit 데스크톱 70ms, 휴대폰은 더) - 손을 뗀 뒤 0.3초 쉬면
      snapTimer.current = window.setTimeout(build, 300);
    };
    // 미리보기가 svg 자신에 거는 style·data-preview는 내용 변화가 아니다
    const content = new MutationObserver((records) => {
      if (
        records.some(
          (m) =>
            m.target !== svg ||
            (m.attributeName !== "style" && m.attributeName !== "data-preview"),
        )
      )
        invalidate(!viewCommit.current);
    });
    content.observe(svg, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    // 테마·나라 이름 숨기기(html 속성)도 그림을 바꾼다
    const page = new MutationObserver(() => {
      major.current++;
      invalidate();
    });
    page.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-names"],
    });
    invalidate();
    return () => {
      content.disconnect();
      page.disconnect();
      window.clearTimeout(snapTimer.current);
    };
  }, []);

  // 휠 확대 (페이지 스크롤을 막아야 해서 passive: false로 직접 등록)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(
        zoomRef.current * Math.exp(-e.deltaY * 0.0015),
        e.clientX,
        e.clientY,
        150,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // 시점이 바뀌면 가까운 방향으로 회전. 시점 경도는 패널에 가려지지 않은 영역의 가운데에 온다
  // (데스크톱은 오른쪽 사건 패널이 지도 가운데를 가려, 동아시아 시점이 중앙아시아처럼 보였다)
  // 첫 화면(언어 기준 → 시간대 기준)은 회전 없이 바로 놓는다
  const instant = useRef(true);
  const mounted = useRef(false);
  useEffect(() => {
    if (!viewpoint) return;
    const svg = svgRef.current;
    const shift = svg
      ? (overlayOffset(svg).x * MAP_HEIGHT * 360) /
        (useUi.getState().zoom *
          (svg.parentElement ?? svg).getBoundingClientRect().height *
          MAP_WIDTH)
      : 0;
    const target = VIEWPOINT_BY_ID.get(viewpoint)!.lon + (shift || 0);
    if (instant.current) {
      if (mounted.current) instant.current = false;
      updateLon(target);
      setCenterLon(lonRef.current);
      return;
    }
    const from = lonRef.current;
    const delta = normalizeLon(target - from);
    if (Math.abs(delta) < 0.01) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      updateLon(from + delta * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setCenterLon(lonRef.current);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [viewpoint, setCenterLon, updateLon]);

  // 브라우저에서는 기기 시간대로 사는 곳에 가까운 시점을 고른다(정적 HTML은 언어 기준이라 하이드레이션 뒤에)
  useEffect(() => {
    mounted.current = true;
    let timeZone = "";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}
    const ui = useUi.getState();
    const zone = zoneViewpoint(timeZone);
    const region = homeRegion(timeZone, locale);
    if (region)
      ui.setHome({ region, viewpoint: zone ?? homeViewpoint(locale) });
    if (zone && zone !== ui.viewpoint) ui.initViewpoint(zone);
    else instant.current = false;
  }, [locale]);

  // 사건 목록에서 고르면 그 사건이 "가려지지 않은 영역"의 가운데 오도록 이동·확대
  const focus = useUi((s) => s.focus);
  useEffect(() => {
    const svg = svgRef.current;
    if (!focus || !svg) return;
    const rect = (svg.parentElement ?? svg).getBoundingClientRect();
    const { x: offsetX, y: offsetY } = overlayOffset(svg);
    const fromLon = lonRef.current;
    const fromY = centerYRef.current;
    const fromZoom = zoomRef.current;
    const toZoom = Math.max(fromZoom, 2.5);
    const upp = MAP_HEIGHT / toZoom / rect.height; // 목표 배율에서 픽셀당 지도 단위
    const toLon = focus.coords[0] + (offsetX * upp * 360) / MAP_WIDTH;
    const pointY = makeProjection(0)([0, focus.coords[1]])?.[1] ?? fromY;
    const toY = pointY + offsetY * upp;
    const dLon = normalizeLon(toLon - fromLon);
    setViewpoint(null);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // 이동 중에는 미리보기(다시 그리지 않음), 끝에서 한 번 그린다 - 배율이 바뀌는 애니메이션이 휴대폰에서 끊겼다
      lonRef.current = normalizeLon(fromLon + dLon * k);
      centerYRef.current = fromY + (toY - fromY) * k;
      zoomRef.current = fromZoom + (toZoom - fromZoom) * k;
      if (t < 1) {
        previewZoom(true);
        frame = requestAnimationFrame(tick);
      } else {
        commitZoom();
        setCenterLon(lonRef.current);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [focus, setViewpoint, setCenterLon, previewZoom, commitZoom]);

  // 해안선: 처음엔 가벼운 110m, 확대하면 자세한 50m로 바꾼다(한 번 받으면 계속 사용)
  const [detailedLand, setDetailedLand] = useState<typeof land | null>(null);
  useEffect(() => {
    if (zoom < 1.5 || detailedLand) return;
    let alive = true;
    loadDetailedLand()
      .then((l) => alive && setDetailedLand(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [zoom, detailedLand]);
  const landShape = zoom >= 1.5 && detailedLand ? detailedLand : land;

  const visible = useVisibleEvents();
  const events = useMemo(
    () => limitPins(visible, selectedEventId),
    [visible, selectedEventId],
  );
  // 성능: 투영은 경도 0에서 한 번만 하고, 좌우 이동(회전)은 그룹을 옮기는 것(translate)으로 처리한다.
  // 메르카토르에서 경도 회전 = 가로 평행 이동이라 결과가 같고, 끌 때마다 모든 국경을 다시 계산하지 않는다.
  const { path, project } = useMemo(() => {
    const projection = makeProjection(0);
    // 서버(Node)와 브라우저의 부동소수점 끝자리가 달라 하이드레이션 불일치가 나지 않도록 반올림
    const project = (coords: [number, number]) => {
      const p = projection(coords);
      return p && ([round1(p[0]), round1(p[1])] as const);
    };
    return { path: geoPath(projection).digits(1), project };
  }, []);

  // 확대할수록 작은 나라 이름도 보여준다. 선택한 나라는 항상
  // 나라가 적은 시대(고대 초기 등)는 작은 나라도 이름을 모두 보여준다
  const labeled = useMemo(() => {
    const minArea = polities.length <= 30 ? 0 : LABEL_MIN_AREA / (zoom * zoom);
    const sorted = polities
      .filter(
        (p) =>
          p.properties.l &&
          (p.properties.a >= minArea || p.properties.n === selectedPolity),
      )
      // 넓이가 같으면(원본의 겹친 층) 괄호 없는 이름을 먼저 — "(Carolingian Empire)"보다 "Kingdom of the Franks"
      .sort(
        (a, b) =>
          b.properties.a - a.properties.a ||
          Number(a.properties.n.startsWith("(")) -
            Number(b.properties.n.startsWith("(")),
      );
    // 최대 개수는 조각 수가 아니라 이름 수로 센다 - 한 나라가 여러 조각·겹친 층(식민지, "(British Empire)" 등)이면
    // 조각마다 한 자리씩 차지해 영국 같은 큰 나라 이름이 밀려나던 문제
    const limit = Math.round(MAX_LABELS * zoom);
    const names = new Set<string>();
    const out: typeof sorted = [];
    for (const p of sorted) {
      // 선택한 나라는 개수와 상관없이 항상 이름을 단다
      if (!names.has(p.properties.n) && p.properties.n !== selectedPolity) {
        if (names.size >= limit) continue;
        names.add(p.properties.n);
      }
      out.push(p);
    }
    return out;
  }, [polities, zoom, selectedPolity]);

  // 글자·핀은 확대해도 화면에서 거의 같은 크기로 (지도 좌표 ÷ 배율)
  const unit = 1 / zoom;

  // 이름 배치: 큰 나라부터 놓고, 이미 놓인 이름과 겹치면 뺀다(선택한 나라는 항상 먼저)
  const placedLabels = useMemo(() => {
    const ordered = [...labeled].sort(
      (a, b) =>
        Number(b.properties.n === selectedPolity) -
        Number(a.properties.n === selectedPolity),
    );
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const placed: {
      key: string;
      x: number;
      y: number;
      fontSize: number;
      text: string;
    }[] = [];
    // 원본 국경은 같은 땅을 여러 층으로 겹쳐 둔다(예: 840년 "Kingdom of the Franks"·"(Kingdom of the Franks)"·
    // "(Carolingian Empire)"가 넓이·위치까지 같음) → 같은 이름이나 같은 자리의 이름표는 하나만
    const seenText = new Set<string>();
    const seenPoint = new Set<string>();
    ordered.forEach((p, i) => {
      const at = project(p.properties.l!);
      if (!at) return;
      const point = p.properties.l!.join(",");
      const name = nameOf(p.properties);
      if (seenText.has(name) || seenPoint.has(point)) return;
      seenText.add(name);
      seenPoint.add(point);
      // 기본 8.5, 큰 나라일수록 최대 15까지 (지도 좌표 단위)
      const base = Math.min(
        15,
        8.5 + Math.log10(Math.max(1, p.properties.a / LABEL_MIN_AREA)) * 4,
      );
      const selected = p.properties.n === selectedPolity;
      const fontSize = round2(
        (selected ? Math.max(base, 13) : base) * Math.pow(unit, 0.8),
      );
      const text = name;
      // 글자 폭 추정: 한글·한자 등은 글자 크기만큼, 라틴 문자는 약 0.58배
      const width = [...text].reduce(
        (w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.58) * fontSize,
        0,
      );
      const boxAt = (y: number) => ({
        x0: at[0] - width / 2,
        x1: at[0] + width / 2,
        y0: y - fontSize,
        y1: y + fontSize * 0.25,
      });
      const free = (b: ReturnType<typeof boxAt>) =>
        !boxes.some(
          (o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0,
        );
      // 제자리가 막히면 위아래로 조금씩 비켜 본다
      const y = [0, 1.3, -1.3, 2.6, -2.6]
        .map((step) => at[1] + step * fontSize)
        .find((cy) => free(boxAt(cy)));
      // 나라가 적은 시대(고대 초기)·선택한 나라는 자리가 없어도 표시한다
      if (y === undefined && !selected && polities.length > 30) return;
      const finalY = round1(y ?? at[1]);
      boxes.push(boxAt(finalY));
      placed.push({
        key: `${p.properties.n}-${i}`,
        x: at[0],
        y: finalY,
        fontSize,
        text,
      });
    });
    return placed;
  }, [labeled, selectedPolity, project, unit, nameOf, polities.length]);
  // 해안선·경위선은 서버 HTML에 넣지 않는다(JS 번들에 같은 데이터가 있어 HTML만 수백 KB 커짐)
  const hydrated = useHydrated();
  const landD = useMemo(
    () => (hydrated ? (path(landShape) ?? "") : ""),
    [hydrated, path, landShape],
  );
  const graticuleD = useMemo(
    () => (hydrated ? (path(graticule) ?? "") : ""),
    [hydrated, path],
  );
  const polityDs = useMemo(
    () => polities.map((p) => path(p) ?? ""),
    [path, polities],
  );
  // 지금 경도만큼 옮긴 위치에 지도를 놓고, 화면에 걸치는 복사본만 그린다(끝없이 이어지는 지도)
  const shift = round1((-lon * MAP_WIDTH) / 360);
  // 복사본 key는 순번(k) - 위치(offset)로 하면 경도가 조금만 바뀌어도(끌기·확대 뒤 다시 그릴 때마다) 복사본을 통째로 지우고
  // 국경 수천 개를 새로 만들어 휴대폰에서 손을 뗀 뒤 크게 멈췄다. 순번이면 위치(transform)만 바뀐다
  const copies = [-2, -1, 0, 1, 2]
    .map((k) => ({ k, offset: round1(shift + k * MAP_WIDTH) }))
    .filter(({ offset: o }) => o < v.x + v.w && o + MAP_WIDTH > v.x);

  // 지도 내용은 끌기 중에 바뀌지 않으므로 한 번 만들어 복사본마다 재사용(React가 다시 그리지 않는다).
  // 국경(배율과 무관)과 핀·이름표(배율에 따라 크기가 바뀜)를 나눠, 배율이 바뀌어도 수백 개 국경 경로는 다시 맞춰 보지 않는다
  const bordersLayer = useMemo(
    () => (
      <>
        <path
          d={graticuleD}
          fill="none"
          stroke="var(--map-graticule)"
          style={{ strokeWidth: "calc(0.5 * var(--px))" }}
        />
        {/* 육지 + 나라 영역. 나라 색은 해안선 모양으로 잘라 바다로 번지지 않게 한다 */}
        <path d={landD} fill="var(--map-land)" />

        {/* 선택 연도의 나라 영역 */}
        <g
          clipPath="url(#land-clip)"
          stroke="var(--map-border)"
          strokeLinejoin="round"
          style={{ strokeWidth: "calc(0.6 * var(--px))" }}
        >
          {polities.map((p, i) => {
            const selected = p.properties.n === selectedPolity;
            return (
              <path
                key={`${p.properties.n}-${i}`}
                data-polity={p.properties.n}
                d={polityDs[i]}
                fill={polityColor(p.properties)}
                style={
                  selected
                    ? {
                        fillOpacity: "calc(var(--map-region-opacity) + 0.3)",
                        stroke: "var(--map-label)",
                        strokeWidth: "calc(1.6 * var(--px))",
                      }
                    : { fillOpacity: "var(--map-region-opacity)" }
                }
              />
            );
          })}
        </g>
        <path
          d={landD}
          fill="none"
          stroke="var(--map-border)"
          style={{ strokeWidth: "calc(0.5 * var(--px))" }}
        />
      </>
    ),
    [graticuleD, landD, polities, polityDs, selectedPolity],
  );
  const overlayLayer = useMemo(
    () => (
      <>
        {/* 사건 핀: 보이는 점은 작게, 터치 영역(r=16)은 크게. 확대해도 화면 크기 유지 */}
        {events.map((e) => {
          const p = project(e.coords);
          const region = REGION_BY_ID.get(e.region);
          if (!p || !region) return null;
          const selected = e.id === selectedEventId;
          return (
            <g
              key={e.id}
              data-event-id={e.id}
              transform={`translate(${p[0]} ${p[1]}) scale(${round2(unit * 1.2)})`}
              className="cursor-pointer"
            >
              <title>{`${formatWhen(e, locale)} ${eventTitle(e, locale)}`}</title>
              <circle r={16} fill="transparent" />
              {/* 고른 점: 물결이 퍼져 "지금 이 사건"이 바로 보이게 */}
              {selected && (
                <circle
                  r={7.5}
                  fill="none"
                  stroke={region.color}
                  strokeWidth={2}
                  className="pointer-events-none origin-center animate-pin-pulse [transform-box:fill-box] motion-reduce:hidden"
                />
              )}
              <circle r={selected ? 7.5 : 6} fill="var(--map-pin-stroke)" />
              <circle
                r={selected ? 5 : 4}
                fill={region.color}
                stroke="var(--map-pin-ring)"
                strokeWidth={selected ? 1.5 : 1}
              />
            </g>
          );
        })}

        {/* 나라 이름: 큰 나라부터, 면적에 따라 글자 크기. 핀보다 위에 그리되 터치는 통과 */}
        <g
          fontWeight={600}
          textAnchor="middle"
          fill="var(--map-label)"
          stroke="var(--map-label-halo)"
          strokeWidth={round2(3 * unit)}
          paintOrder="stroke"
          className="map-names pointer-events-none"
        >
          {placedLabels.map((label) => (
            <text
              key={label.key}
              x={label.x}
              y={label.y}
              fontSize={label.fontSize}
            >
              {label.text}
            </text>
          ))}
        </g>

        {/* 고른 사건 이름: 점 바로 위 말풍선, 나라 이름보다 위 층(나라 이름과 붙어 읽히지 않게 바탕을 깐다). 터치는 통과 */}
        {(() => {
          const e = events.find((ev) => ev.id === selectedEventId);
          const p = e && project(e.coords);
          if (!e || !p) return null;
          const title = eventTitle(e, locale);
          // 글자 폭 어림(한중일 글자 1em, 그 밖 0.6em) - 말풍선 너비
          const width =
            [...title].reduce(
              (w, ch) => w + (ch.codePointAt(0)! >= 0x2e80 ? 12 : 7.2),
              0,
            ) + 14;
          return (
            <g
              transform={`translate(${p[0]} ${p[1]}) scale(${round2(unit * 1.2)})`}
              className="pointer-events-none"
            >
              <rect
                x={-width / 2}
                y={-33}
                width={width}
                height={20}
                rx={6}
                style={{ fill: "var(--surface)", stroke: "var(--line)" }}
                strokeWidth={1}
              />
              <text
                y={-19}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--map-label)"
              >
                {title}
              </text>
            </g>
          );
        })()}
      </>
    ),
    [events, project, unit, selectedEventId, locale, placedLabels],
  );

  /** 지금 지도 그림(canvas)으로 미리보기 중인지 */
  const snapPreviewing = () => snapHost.current?.style.visibility === "visible";
  /**
   * 손을 뗀 뒤 그리기: 지도 그림으로 미리보기 중이면 0.25초 쉴 때 한 번(연달아 확대·끌기하는 동안 다시 그리지 않는다 -
   * 다시 그리는 순간 휴대폰이 잠깐 멈춰 다음 손짓과 겹치면 걸렸다), 아니면 바로.
   */
  const settle = () => {
    window.clearTimeout(settleTimer.current);
    const done = () => {
      commitZoom();
      setCenterLon(lonRef.current);
    };
    if (!snapPreviewing()) return done();
    settleTimer.current = window.setTimeout(() => {
      if (!gesture.current && !momentum.current) done();
    }, 250);
  };
  const stopMomentum = () => {
    cancelAnimationFrame(momentum.current);
    momentum.current = 0;
  };
  /** 관성: 끌다 놓은 속도(px/ms)로 미끄러지다 멈춘다(지도 그림만 옮김, iOS 스크롤과 비슷한 감속) */
  const fling = (vx: number, vy: number) => {
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const rect = mapRect();
      if (!rect || !snapUsable()) {
        momentum.current = 0;
        return settle();
      }
      const upp = view(zoomRef.current, centerYRef.current).h / rect.height;
      lonRef.current = normalizeLon(
        lonRef.current - (vx * dt * upp * 360) / MAP_WIDTH,
      );
      centerYRef.current -= vy * dt * upp;
      const k = Math.exp(-dt / 325);
      vx *= k;
      vy *= k;
      previewZoom(true);
      if (Math.hypot(vx, vy) < 0.02) {
        momentum.current = 0;
        return settle();
      }
      momentum.current = requestAnimationFrame(step);
    };
    momentum.current = requestAnimationFrame(step);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // 관성 이동을 잡고, 쉴 때 그리기 예약은 미룬다(지도 그림 미리보기에서 이어 간다)
    stopMomentum();
    window.clearTimeout(settleTimer.current);
    const previewing = snapPreviewing();
    // svg를 직접 늘린 미리보기(휠 등)가 남아 있으면 먼저 그린다(끌기는 그린 화면 기준)
    if (
      !gesture.current &&
      !previewing &&
      (svgRef.current?.style.transform || previewFrame.current)
    )
      commitZoom();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...pointers.current.values()];
    if (b) {
      // 두 번째 손가락: 핀치 시작
      gesture.current = {
        x: a.x,
        y: a.y,
        lon: lonRef.current,
        centerY: centerYRef.current,
        moved: true,
        eventId: null,
        polity: null,
        pinch: {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          zoom: zoomRef.current,
        },
      };
      return;
    }
    const target = e.target as Element;
    // 화면 끝에 붙어 잘린 중심값 대신 실제로 보이는 중심에서 시작(미리보기 중이면 그 화면)
    const cv = view(zoomRef.current, centerYRef.current);
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      lon: lonRef.current,
      centerY: cv.y + cv.h / 2,
      moved: false,
      stale: previewing,
      samples: [[e.timeStamp, e.clientX, e.clientY]],
      eventId: previewing
        ? null
        : (target.closest("[data-event-id]")?.getAttribute("data-event-id") ??
          null),
      polity: previewing
        ? null
        : (target.closest("[data-polity]")?.getAttribute("data-polity") ??
          null),
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...pointers.current.values()];

    if (g.pinch && b) {
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      // 손가락을 뗄 때 그린다(onPointerUp)
      zoomAt(
        g.pinch.zoom * (dist / g.pinch.dist),
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        0,
      );
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!g.moved) {
      g.moved = true;
      setViewpoint(null);
    }
    const unitsPerPixel =
      view(zoomRef.current, centerYRef.current).h / (mapRect()?.height ?? 1);
    g.samples?.push([e.timeStamp, e.clientX, e.clientY]);
    if (g.samples && g.samples.length > 6) g.samples.shift();
    const nextLon = g.lon - dx * unitsPerPixel * (360 / MAP_WIDTH);
    const nextY = g.centerY - dy * unitsPerPixel;
    // 지도 그림이 있으면(휴대폰) 그림만 옮기고 손을 뗄 때 한 번 그린다 - 끌 때마다 다시 그리면 아이폰에서 밀렸다
    if (snapUsable()) {
      lonRef.current = normalizeLon(nextLon);
      centerYRef.current = nextY;
      previewZoom();
      return;
    }
    updateLon(nextLon);
    updateCenterY(nextY);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    // 핀치가 끝나면(손가락 하나라도 떼면) 미리보기 배율을 그린다 - 지도 그림 미리보기면 이어지는 끌기도 그림으로 하고 쉴 때 그린다
    if (g?.pinch && !snapPreviewing()) commitZoom();
    if (pointers.current.size > 0) {
      // 핀치 중 한 손가락만 뗐으면 남은 손가락으로 이어서 끌기
      const [rest] = [...pointers.current.values()];
      if (g) {
        gesture.current = {
          ...g,
          pinch: undefined,
          x: rest.x,
          y: rest.y,
          lon: lonRef.current,
          centerY: centerYRef.current,
          samples: [[e.timeStamp, rest.x, rest.y]],
        };
      }
      return;
    }
    gesture.current = null;
    if (!g) return;
    if (g.moved) {
      // 놓기 직전 0.1초의 속도로 관성 이동(핀치 끝은 제외)
      const recent = (g.samples ?? []).filter(([t]) => e.timeStamp - t < 100);
      const [t0, x0, y0] = recent[0] ?? [0, 0, 0];
      const dt = e.timeStamp - t0;
      const vx = dt > 0 ? (e.clientX - x0) / dt : 0;
      const vy = dt > 0 ? (e.clientY - y0) / dt : 0;
      if (
        !g.pinch &&
        recent.length > 1 &&
        Math.hypot(vx, vy) > 0.3 &&
        snapPreviewing()
      )
        fling(vx, vy);
      else settle();
      return;
    }
    // 지도 그림 미리보기 중에 누른 탭: 지금 화면을 바로 그리고 그 자리의 핀·나라를 찾는다
    if (g.stale) {
      flushSync(() => commitZoom());
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      g.eventId =
        hit?.closest("[data-event-id]")?.getAttribute("data-event-id") ?? null;
      g.polity =
        hit?.closest("[data-polity]")?.getAttribute("data-polity") ?? null;
    }
    // 손가락 두 번 탭 = 확대(iOS는 touch-none 지도에서 dblclick이 오지 않을 때가 있어 직접 판정)
    if (e.pointerType === "touch") {
      const now = Date.now();
      const p = lastTap.current;
      if (
        p &&
        now - p.t < 320 &&
        Math.hypot(e.clientX - p.x, e.clientY - p.y) < 30
      ) {
        lastTap.current = null;
        touchZoomAt.current = now;
        zoomAt(zoomRef.current * 2, e.clientX, e.clientY);
        return;
      }
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
    // 탭으로 연 패널이 뒤따르는 click에 바로 닫히지 않게(components/map/ghostClick)
    swallowNextClick();
    if (g.eventId) {
      // 시트가 열리며 점을 덮으므로, 패널 크기가 바뀐 뒤(두 프레임 뒤) 점을 가려지지 않은 영역 가운데로 옮긴다
      const coords = events.find((ev) => ev.id === g.eventId)?.coords;
      selectFromMap(g.eventId);
      if (coords)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => focusOn(coords)),
        );
    } else
      setSelectedPolity((cur) =>
        g.polity && g.polity !== cur ? g.polity : null,
      );
  };

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`${round1(v.x)} ${round1(v.y)} ${round1(v.w)} ${round1(v.h)}`}
        preserveAspectRatio={size ? "none" : "xMidYMid slice"}
        // 화면 1px = 지도 몇 단위(국경선 굵기용). vector-effect: non-scaling-stroke는 배율이 바뀔 때마다 WebKit이
        // 국경 수백 개의 선 모양을 다시 계산해(손을 뗀 뒤 다시 그릴 때 35~55ms) 굵기를 직접 나눈다. 크기를 재기 전(서버 HTML)은 화면 높이 800px로 어림
        style={
          {
            "--px": round4(v.h / (size?.h ?? 800)),
          } as React.CSSProperties
        }
        role="img"
        aria-label={fill(messages.ui.mapLabel, {
          year: formatPeriod(period, locale),
        })}
        className="absolute inset-0 block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          // 핀치·끌기 미리보기가 남아 있으면 그린다(지도 그림이면 쉴 때)
          if (gesture.current?.pinch || gesture.current?.moved) settle();
          gesture.current = null;
        }}
        onDoubleClick={(e) => {
          // 손가락 두 번 탭은 onPointerUp에서 이미 확대했다
          if (Date.now() - touchZoomAt.current < 600) return;
          zoomAt(zoomRef.current * 2, e.clientX, e.clientY);
        }}
      >
        <rect
          x={round1(v.x)}
          y={0}
          width={round1(v.w)}
          height={MAP_HEIGHT}
          fill="var(--map-ocean)"
        />
        <defs>
          <clipPath id="land-clip">
            <path d={landD} />
          </clipPath>
        </defs>
        {copies.map(({ k, offset }) => (
          <g key={k} transform={`translate(${offset} 0)`}>
            {bordersLayer}
            {overlayLayer}
          </g>
        ))}
      </svg>
      {/* 휴대폰 확대·끌기 중에 svg 대신 보이는 지도 그림(snapshot) */}
      <div
        ref={snapHost}
        aria-hidden
        className="pointer-events-none invisible absolute inset-0 overflow-hidden"
      />
    </>
  );
}
