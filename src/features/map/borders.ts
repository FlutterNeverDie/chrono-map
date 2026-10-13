"use client";

import { useCallback, useEffect, useState } from "react";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { Locale } from "@/lib/types";
import { loadJson, loadPolities, useSettled } from "@/components/map";

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

/** 선택 연도에 쓸 스냅샷: 그 연도 이하 중 가장 가까운 것 */
export function snapshotFor(years: number[], year: number): number {
  let pick = years[0];
  for (const y of years) if (y <= year) pick = y;
  return pick;
}

async function loadYear(year: number): Promise<Polity[]> {
  const years = await loadJson<number[]>("/borders/index.json");
  return loadPolities<PolityProps>(`/borders/${snapshotFor(years, year)}.json`);
}

/** 선택 연도의 정치체 영역 + 현재 언어 이름표. 불러오는 동안에는 이전 값을 유지한다 */
export function useBorders(year: number, locale: Locale) {
  const [polities, setPolities] = useState<Polity[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  // 슬라이더를 끄는 동안 지나가는 연도마다 파일을 받지 않도록, 멈춘 연도만 받는다(공용 캐시·재시도)
  const settledYear = useSettled(year);
  useEffect(() => {
    let alive = true;
    loadYear(settledYear)
      .then((p) => alive && setPolities(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [settledYear]);

  useEffect(() => {
    let alive = true;
    loadJson<Record<string, string>>(`/borders/names/${locale}.json`)
      .then((n) => alive && setNames(n))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [locale]);

  const nameOf = useCallback((p: PolityProps) => names[p.n] || p.n, [names]);
  return { polities, nameOf };
}
