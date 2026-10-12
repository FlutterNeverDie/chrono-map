"use client";

import { useEffect, useState } from "react";
import { geoArea, geoGraticule10, geoMercator } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import world from "world-atlas/land-110m.json";
import type { Locale } from "@/lib/types";

/** 평면 지도(메르카토르). 위도 82°N ~ 58°S, 가로 1000 */
export const MAP_WIDTH = 1000;
const SCALE = MAP_WIDTH / (2 * Math.PI);
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export const MAP_HEIGHT = Math.round(SCALE * (mercY(82) - mercY(-58)));

export function makeProjection(centerLon: number) {
  return geoMercator()
    .rotate([-centerLon, 0])
    .scale(SCALE)
    .translate([MAP_WIDTH / 2, SCALE * mercY(82)])
    .clipExtent([
      [0, 0],
      [MAP_WIDTH, MAP_HEIGHT],
    ]);
}

export const normalizeLon = (lon: number) =>
  ((((lon + 180) % 360) + 360) % 360) - 180;
export const graticule = geoGraticule10();
const topo = world as unknown as Topology<{ land: GeometryCollection }>;
export const land = feature(topo, topo.objects.land);

export type PolityProps = { n: string; a: number; l?: [number, number] };
export type Polity = Feature<Polygon | MultiPolygon, PolityProps>;

const cache = new Map<string, Promise<unknown>>();
const load = <T>(url: string) => {
  if (!cache.has(url))
    cache.set(
      url,
      fetch(url).then((r) => r.json()),
    );
  return cache.get(url) as Promise<T>;
};

/** 그 해 국경(public/ww2/borders) + 언어별 나라 이름(본 지도와 같은 public/borders/names 사용) */
export function useWw2Borders(year: number, locale: Locale) {
  const [polities, setPolities] = useState<Polity[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const clamped = Math.min(1945, Math.max(1937, year));

  useEffect(() => {
    let alive = true;
    load<Topology<{ p: GeometryCollection<PolityProps> }>>(
      `/ww2/borders/${clamped}.json`,
    )
      .then((t) => {
        const list = (feature(t, t.objects.p).features as Polity[]).filter(
          (p) => geoArea(p) < 2 * Math.PI,
        );
        if (alive) setPolities(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [clamped]);

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
