"use client";

import { useEffect, useState } from "react";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon } from "geojson";

/** 공용 국경 로더: 정적 TopoJSON(public/…)과 언어별 나라 이름(public/borders/names). 한 번 받은 파일은 메모리에 둔다 */
export type PolityProps = {
  n: string;
  a: number;
  l?: [number, number];
  w?: string;
};
export type Polity = Feature<Polygon | MultiPolygon, PolityProps>;

/**
 * 받은 파일 캐시(최근에 쓴 것 순, 최대 CACHE_MAX개). 실패한 요청은 캐시에서 빼서 다음에 다시 시도한다.
 * 국경 파일은 원본 JSON 대신 변환한 도형을 보관한다(같은 파일을 다시 변환하지 않게).
 */
const CACHE_MAX = 24;
const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit as Promise<T>;
  }
  const p = make().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, p);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return p;
}
const fetchJson = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

export function loadJson<T>(url: string): Promise<T> {
  return cached(url, () => fetchJson<T>(url));
}

/** 국경 TopoJSON → 도형 목록 (방향이 뒤집힌 도형(넓이 > 반구)은 지도 전체를 칠하므로 버린다) */
export function loadPolities<P extends PolityProps = PolityProps>(
  url: string,
): Promise<Feature<Polygon | MultiPolygon, P>[]> {
  return cached(`polities:${url}`, async () => {
    const t = await fetchJson<Topology<{ p: GeometryCollection<P> }>>(url);
    return (
      feature(t, t.objects.p).features as Feature<Polygon | MultiPolygon, P>[]
    ).filter((p) => geoArea(p) < 2 * Math.PI);
  });
}

/** 값이 ms 동안 그대로일 때만 바뀌는 값 — 슬라이더를 빠르게 끌 때 지나가는 연도마다 파일을 받지 않게 */
export function useSettled<T>(value: T, ms = 150): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (Object.is(value, settled)) return;
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, settled, ms]);
  return settled;
}

/** url의 국경 파일을 받아 도형 목록으로 (url이 null이면 비움). 받는 동안 이전 값을 유지 */
export function usePolities(url: string | null): Polity[] {
  const [polities, setPolities] = useState<Polity[]>([]);
  const settledUrl = useSettled(url);
  useEffect(() => {
    let alive = true;
    if (!settledUrl) {
      queueMicrotask(() => alive && setPolities([]));
      return;
    }
    loadPolities(settledUrl)
      .then((list) => alive && setPolities(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [settledUrl]);
  return polities;
}

export function usePolityNames(locale: string) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    loadJson<Record<string, string>>(`/borders/names/${locale}.json`)
      .then((n) => alive && setNames(n))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [locale]);
  return (p: PolityProps) => names[p.n] || p.n;
}

/** 본 지도용 연도 스냅샷 목록(public/borders/index.json)에서 그 해 이하 가장 가까운 파일. 첫 스냅샷 이전이면 null */
export function useMainBordersUrl(year: number): string | null {
  const [years, setYears] = useState<number[] | null>(null);
  useEffect(() => {
    loadJson<number[]>("/borders/index.json")
      .then(setYears)
      .catch(() => {});
  }, []);
  if (!years || year < years[0]) return null;
  let pick = years[0];
  for (const y of years) if (y <= year) pick = y;
  return `/borders/${pick}.json`;
}

const PALETTE = [
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
/** 나라마다 고정된 색 */
export function polityColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
