/// <reference lib="webworker" />
import type { MultiPolygon, Polygon } from "geojson";
import { makeProjection } from "../projection";
import { shapeOf } from "./polygons";

/**
 * 작업 스레드: 큰 도형(확대하면 받는 50m 해안선 - 유라시아 다각형 하나가 점 수만 개)을 삼각형으로.
 * 화면 스레드에서 하면 처음 확대할 때 한 번 멈췄다(Chrome CPU 4배 느림 170~220ms, 아이폰 엔진은 더).
 * 받는 것: { id, geometries }, 보내는 것: { id, shapes: [{ rings, holes, tris, flat, box }] } - shapes.ts가 그대로 캐시에 넣는다
 */
const projection = makeProjection(0);
self.onmessage = (
  e: MessageEvent<{ id: number; geometries: (Polygon | MultiPolygon)[] }>,
) => {
  const shapes = e.data.geometries.map((geometry) => {
    const sh = shapeOf(projection, {
      type: "Feature",
      properties: {},
      geometry,
    });
    const flat = sh.rings.flat(2);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < flat.length; i += 2) {
      x0 = Math.min(x0, flat[i]);
      x1 = Math.max(x1, flat[i]);
      y0 = Math.min(y0, flat[i + 1]);
      y1 = Math.max(y1, flat[i + 1]);
    }
    return { ...sh, flat, box: [x0, y0, x1, y1] };
  });
  self.postMessage({ id: e.data.id, shapes });
};
