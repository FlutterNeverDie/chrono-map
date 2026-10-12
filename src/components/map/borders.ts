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

const cache = new Map<string, Promise<unknown>>();
export function loadJson<T>(url: string): Promise<T> {
  if (!cache.has(url))
    cache.set(
      url,
      fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    );
  return cache.get(url) as Promise<T>;
}

/** url의 국경 파일을 받아 도형 목록으로 (url이 null이면 비움). 받는 동안 이전 값을 유지 */
export function usePolities(url: string | null): Polity[] {
  const [polities, setPolities] = useState<Polity[]>([]);
  useEffect(() => {
    let alive = true;
    if (!url) {
      queueMicrotask(() => alive && setPolities([]));
      return;
    }
    loadJson<Topology<{ p: GeometryCollection<PolityProps> }>>(url)
      .then((t) => {
        // 방향이 뒤집힌 도형(넓이 > 반구)은 지도 전체를 칠하므로 버린다
        const list = (feature(t, t.objects.p).features as Polity[]).filter(
          (p) => geoArea(p) < 2 * Math.PI,
        );
        if (alive) setPolities(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
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
