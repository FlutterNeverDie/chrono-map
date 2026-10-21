import { useEffect, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import { land } from "./useMapViewport";

/**
 * 확대했을 때 쓰는 자세한 해안선(50m, 약 550KB). public/geo에 두고 필요할 때 한 번만 받는다(본 지도·주제 지도·전쟁 지도가 같이)
 */
let detailed: Promise<FeatureCollection | Feature> | null = null;
export function loadDetailedLand(): Promise<FeatureCollection | Feature> {
  detailed ??= fetch("/geo/land-50m.json")
    .then((r) => r.json())
    .then((t: Topology<{ land: GeometryCollection }>) =>
      feature(t, t.objects.land),
    );
  return detailed;
}

/** 지금 배율에 맞는 해안선: 처음엔 가벼운 110m, 1.5배 넘게 확대하면 자세한 50m(한 번 받으면 계속) */
export function useLandFor(zoom: number): FeatureCollection | Feature {
  const [detail, setDetail] = useState<FeatureCollection | Feature | null>(
    null,
  );
  useEffect(() => {
    if (zoom < 1.5 || detail) return;
    let alive = true;
    loadDetailedLand()
      .then((l) => alive && setDetail(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [zoom, detail]);
  return zoom >= 1.5 && detail ? detail : land;
}
