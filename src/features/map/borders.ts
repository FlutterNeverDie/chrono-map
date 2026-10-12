"use client";

import { useEffect, useState } from "react";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { Locale } from "@/lib/types";

/**
 * 연도별 역사 국경 (public/borders, scripts/build-borders.mjs가 생성).
 * 원본: Cliopatria (Seshat Global History Databank), CC BY 4.0
 */
export type PolityProps = {
  /** 원본 이름(영어) — 언어별 이름표(names/<언어>.json)의 열쇠 */
  n: string;
  /** Wikidata ID — 색 고정용 */
  w?: string;
  /** 면적 km² */
  a: number;
  /** 라벨 위치 [경도, 위도] */
  l?: [number, number];
};
export type Polity = Feature<Polygon | MultiPolygon, PolityProps>;

const cache = new Map<string, Promise<unknown>>();
function load<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

/** 선택 연도에 쓸 스냅샷: 그 연도 이하 중 가장 가까운 것 */
export function snapshotFor(years: number[], year: number): number {
  let pick = years[0];
  for (const y of years) if (y <= year) pick = y;
  return pick;
}

async function loadPolities(year: number): Promise<Polity[]> {
  const years = await load<number[]>("/borders/index.json");
  const topo = await load<Topology<{ p: GeometryCollection<PolityProps> }>>(
    `/borders/${snapshotFor(years, year)}.json`,
  );
  // 안전장치: 방향이 뒤집힌 도형(넓이 > 반구)은 지도 전체를 칠하므로 버린다
  return (feature(topo, topo.objects.p).features as Polity[]).filter(
    (p) => geoArea(p) < 2 * Math.PI,
  );
}

/** 선택 연도의 정치체 영역 + 현재 언어 이름표. 불러오는 동안에는 이전 값을 유지한다 */
export function useBorders(year: number, locale: Locale) {
  const [polities, setPolities] = useState<Polity[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    loadPolities(year)
      .then((p) => alive && setPolities(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [year]);

  useEffect(() => {
    let alive = true;
    load<Record<string, string>>(`/borders/names/${locale}.json`)
      .then((n) => alive && setNames(n))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [locale]);

  return { polities, nameOf: (p: PolityProps) => names[p.n] || p.n };
}
