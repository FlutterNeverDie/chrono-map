/**
 * WebGL 지도 데이터 검사(1단계): 국경 스냅샷 222장 전부를 브라우저와 같은 코드(src/components/map/gl/polygons.ts)로
 * 투영·삼각형으로 나눠, 삼각형 넓이 합이 원래 도형 넓이(바깥 - 구멍)와 맞는지, 한 장에 얼마나 걸리는지 잰다.
 * 확인 그림: 몇 해를 삼각형으로 칠한 svg(경계선 + 삼각형 선)도 만든다.
 *
 *   npx tsx scripts/dev/mesh-check.ts [그림 폴더]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  makeProjection,
} from "../../src/features/map/baseMap";
import {
  shapeOf,
  signedArea,
  type Shape,
} from "../../src/components/map/gl/polygons";
import { polityColor } from "../../src/components/map/polityColor";

const ROOT = join(__dirname, "../..");
type Props = { n: string; w?: string; a: number };

const triArea = (s: Shape) => {
  const pts = s.rings.flat();
  let a = 0;
  for (let i = 0; i < s.tris.length; i += 3) {
    const [x1, y1] = pts[s.tris[i]];
    const [x2, y2] = pts[s.tris[i + 1]];
    const [x3, y3] = pts[s.tris[i + 2]];
    a += Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2;
  }
  return a;
};
const ringArea = (s: Shape) =>
  s.rings.reduce(
    (t, r, i) => t + (s.holes[i] ? -1 : 1) * Math.abs(signedArea(r)),
    0,
  );

/** 확인 그림: 지금 지도와 같은 칠(땅색 바탕, 나라 색 진하기 0.38을 해안선으로 자름, 국경선·해안선 색) - 삼각형으로만 칠한다 */
function svgOf(shapes: { s: Shape; color: string }[], land: Shape[]) {
  const d = (r: [number, number][]) =>
    `M${r.map((p) => p.map((v) => v.toFixed(2)).join(" ")).join("L")}Z`;
  const tris = (s: Shape) => {
    const pts = s.rings.flat();
    let out = "";
    for (let i = 0; i < s.tris.length; i += 3)
      out += d([pts[s.tris[i]], pts[s.tris[i + 1]], pts[s.tris[i + 2]]]);
    return out;
  };
  const px = MAP_HEIGHT / 1244; // 그림 1px = 지도 몇 단위
  const landTri = land.map(tris).join("");
  const landLine = land.map((s) => s.rings.map(d).join("")).join("");
  const fills = shapes
    .map(({ s, color }) => `<path d="${tris(s)}" fill="${color}" fill-opacity="0.38"/>`)
    .join("");
  const lines = shapes
    .map(({ s }) => `<path d="${s.rings.map(d).join("")}" fill="none" stroke="#a8997a" stroke-width="${0.6 * px}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" width="2000" height="${(2000 * MAP_HEIGHT) / MAP_WIDTH}"><defs><clipPath id="land"><path d="${landTri}"/></clipPath></defs><rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" fill="#cfe6f2"/><path d="${landTri}" fill="#f4ecd6"/><g clip-path="url(#land)">${fills}${lines}</g><path d="${landLine}" fill="none" stroke="#a8997a" stroke-width="${0.5 * px}"/></svg>`;
}

async function main() {
  const out = process.argv[2];
  if (out) await mkdir(out, { recursive: true });
  const projection = makeProjection(0);
  const landTopo = JSON.parse(
    await readFile(join(ROOT, "node_modules/world-atlas/land-110m.json"), "utf8"),
  ) as Topology<{ land: GeometryCollection }>;
  const landF = feature(landTopo, landTopo.objects.land) as unknown as {
    features: Feature<Polygon | MultiPolygon>[];
  };
  const land = landF.features.map((f) => shapeOf(projection, f));
  const years = JSON.parse(
    await readFile(join(ROOT, "public/borders/index.json"), "utf8"),
  ) as number[];
  let polities = 0;
  let bad = 0;
  let worst = { err: 0, name: "", year: 0 };
  const times: number[] = [];
  for (const year of years) {
    const t = JSON.parse(
      await readFile(join(ROOT, `public/borders/${year}.json`), "utf8"),
    ) as Topology<{ p: GeometryCollection<Props> }>;
    const t0 = performance.now();
    const feats = (
      feature(t, t.objects.p) as unknown as {
        features: Feature<Polygon | MultiPolygon, Props>[];
      }
    ).features.filter((p) => geoArea(p) < 2 * Math.PI);
    const shapes = feats.map((f) => ({ f, s: shapeOf(projection, f) }));
    times.push(performance.now() - t0);
    for (const { f, s } of shapes) {
      polities++;
      const want = ringArea(s);
      const got = triArea(s);
      const err = want > 1e-6 ? Math.abs(got - want) / want : 0;
      if (err > 0.005) bad++;
      if (err > worst.err) worst = { err, name: f.properties.n, year };
    }
    if (out && [-500, 1223, 1914].includes(year))
      await writeFile(
        join(out, `tri-${year}.svg`),
        svgOf(
          shapes.map(({ f, s }) => ({
            s,
            color: polityColor(f.properties.w ?? f.properties.n),
          })),
          land,
        ),
      );
  }
  times.sort((a, b) => a - b);
  console.log(`스냅샷 ${years.length}장 · 나라 ${polities}개`);
  console.log(
    `삼각형 넓이가 도형 넓이와 0.5% 넘게 다른 나라: ${bad}개 (가장 큰 차이 ${(worst.err * 100).toFixed(3)}% - ${worst.year}년 ${worst.name})`,
  );
  console.log(
    `한 장 처리(받은 뒤 도형 풀기 + 투영 + 삼각형, 맥 Node): 중간 ${times[times.length >> 1].toFixed(1)}ms · 가장 느린 ${times[times.length - 1].toFixed(1)}ms`,
  );
}
main();
