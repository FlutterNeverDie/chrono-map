import type { Ring } from "@/components/map/gl/polygons";
import { glProjection } from "@/components/map/gl/shapes";
import { cssColor } from "@/components/map/gl/shapes";
import { alphaAt, cut, growAt, rng, smooth, type LonLat, type Scene } from "./sceneData";
import { INK } from "./sceneArt";

/**
 * 판 층(땅에 눕는 것 - 칠한 곳·강·선·전선·참호·도시 점·진지 땅)을 WebGL 장면 판이 그릴 도형으로(예전 PlaneLayer svg와 같은 모양·굵기).
 * 좌표는 경도 0 지도 좌표(날짜변경선을 넘어도 이어지게 펼침), 굵기·간격은 화면 px(기울이기 전 판 위) - unit = 화면 1px의 지도 단위
 */
export type PlaneOp =
  | { kind: "fill"; rings: Ring[]; color: number[] }
  | {
      kind: "lines";
      list: { line: Ring; width: number; color: number[]; dash?: [number, number] }[];
      /** 먹선 흔들림(손으로 그린 듯 - 예전 svg feTurbulence와 비슷하게) */
      wobble: boolean;
    };

const color = (c: string, a = 1) => {
  const x = cssColor(c);
  return [x[0], x[1], x[2], a];
};

/** 경위도 꺾은선 → 지도 좌표(날짜변경선을 넘어도 이어지게) */
function projectLine(pts: LonLat[]): Ring {
  const out: Ring = [];
  for (const p of pts) {
    const q = glProjection(p) ?? [0, 0];
    if (!out.length) out.push([q[0], q[1]]);
    else {
      const prev = out[out.length - 1][0];
      out.push([q[0] + Math.round((prev - q[0]) / 1000) * 1000, q[1]]);
    }
  }
  return out;
}

/** 꺾은선 위 일정 간격(지도 단위) 점들과 그 자리의 방향(단위 벡터) */
function along(line: Ring, step: number) {
  const out: { p: [number, number]; n: [number, number] }[] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (!len) continue;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    for (let s = carry; s < len; s += step)
      out.push({ p: [ax + ux * s, ay + uy * s], n: [ux, uy] });
    carry = (carry - len) % step;
    if (carry < 0) carry += step;
  }
  return out;
}

export function planeOps(scene: Scene, t: number, unit: number): PlaneOp[] {
  const ops: PlaneOp[] = [];
  const side = (s?: string) => (s && scene.sides?.[s]?.color) || "#8a7a5c";

  scene.areas?.forEach((a) => {
    const alpha = alphaAt(a, t);
    if (!alpha) return;
    const ring = projectLine(a.polygon);
    ops.push({ kind: "fill", rings: [ring], color: color(side(a.side), (a.opacity ?? 0.25) * alpha) });
    ops.push({
      kind: "lines",
      wobble: true,
      list: [{ line: [...ring, ring[0]], width: 2, color: color(INK, 0.7 * alpha), dash: [6, 5] }],
    });
  });

  // 수레 원진 안쪽: 밟힌 맨땅(둘레는 굴곡지게)
  scene.forts?.forEach((fo, i) => {
    const alpha = alphaAt(fo, t);
    if (!alpha) return;
    const r = rng(`${i}:${fo.at.join(",")}:fort`);
    const waves = [2, 3, 5].map((k) => [k, r() * 0.08, r() * 6.28]);
    const cos = Math.max(0.2, Math.cos((fo.at[1] * Math.PI) / 180));
    const ring = projectLine(
      Array.from({ length: 64 }, (_, j): LonLat => {
        const a = (j / 64) * Math.PI * 2;
        const k = 1.12 + waves.reduce((sum, [n, amp, ph]) => sum + amp * Math.cos(n * a + ph), 0);
        return [fo.at[0] + (Math.cos(a) * fo.radius * k) / cos, fo.at[1] + Math.sin(a) * fo.radius * k];
      }),
    );
    ops.push({ kind: "fill", rings: [ring], color: color("#8a7356", 0.38 * alpha) });
    ops.push({
      kind: "lines",
      wobble: true,
      list: [{ line: [...ring, ring[0]], width: 2, color: color("#6b563e", 0.35 * alpha) }],
    });
  });

  scene.lines?.forEach((l) => {
    const alpha = alphaAt(l, t);
    if (!alpha) return;
    const line = cut(smooth(projectLine(l.path)), growAt(l.grow, t));
    if (line.length < 2) return;
    if (l.style === "river") {
      // 물과 같은 바랜 청회색, 하류(경로 끝)로 갈수록 굵게 - 마디마다 굵기를 조금씩 늘린다
      const parts = 8;
      const step = Math.max(1, Math.floor(line.length / parts));
      // 바깥(진한 테두리)·안(물색) 두 겹을 따로 - 한 겹 안에서는 겹쳐도 진해지지 않는다
      const outer: { line: Ring; width: number; color: number[] }[] = [];
      const inner: { line: Ring; width: number; color: number[] }[] = [];
      for (let j = 0; j < line.length - 1; j += step) {
        const piece = line.slice(j, Math.min(line.length, j + step + 1));
        const k = 0.45 + 0.55 * (j / Math.max(1, line.length - 1));
        outer.push({ line: piece, width: 7 * k, color: color("#41566a", 0.5 * alpha) });
        inner.push({ line: piece, width: 3.6 * k, color: color("#6f8899", alpha) });
      }
      ops.push({ kind: "lines", wobble: true, list: outer });
      ops.push({ kind: "lines", wobble: true, list: inner });
    } else if (l.style === "line") {
      ops.push({ kind: "lines", wobble: true, list: [{ line, width: 2.5, color: color(INK, alpha) }] });
    } else if (l.style === "front") {
      // 톱니 전선: 선 왼쪽(진행 방향 기준)으로 진영 색 이빨
      const fill = color(side(l.side), alpha);
      const teeth = along(line, 20 * unit).map(({ p, n }): Ring => {
        const [x, y] = p;
        const h = 9 * unit;
        const w = 6 * unit;
        return [
          [x - n[0] * w, y - n[1] * w],
          [x + n[1] * h, y - n[0] * h],
          [x + n[0] * w, y + n[1] * w],
        ];
      });
      for (const tooth of teeth) ops.push({ kind: "fill", rings: [tooth], color: fill });
      ops.push({
        kind: "lines",
        wobble: true,
        list: [
          ...teeth.map((tooth) => ({ line: [...tooth, tooth[0]], width: 2, color: color(INK, alpha) })),
          { line, width: 3.5, color: color(INK, alpha) },
        ],
      });
    } else {
      // 참호: 지그재그 흙선
      const zig = along(line, 7 * unit).map(({ p, n }, j): [number, number] => {
        const k = (j % 2 ? 1 : -1) * 4 * unit;
        return [p[0] + n[1] * k, p[1] - n[0] * k];
      });
      ops.push({ kind: "lines", wobble: true, list: [{ line: zig, width: 6, color: color(INK, alpha) }] });
      ops.push({ kind: "lines", wobble: true, list: [{ line: zig, width: 3, color: color("#7a5a3a", alpha) }] });
    }
  });

  // 도시 점: 크림 원 + 먹 테두리(둥근 캡슐을 점 하나로 - 굵기가 지름)
  scene.markers?.forEach((m) => {
    if (m.kind !== "city") return;
    const alpha = alphaAt(m, t);
    if (!alpha) return;
    const [x, y] = glProjection(m.at) ?? [0, 0];
    const dot: Ring = [
      [x, y],
      [x, y],
    ];
    ops.push({
      kind: "lines",
      wobble: false,
      list: [
        { line: dot, width: 15, color: color(INK, alpha) },
        { line: dot, width: 9, color: color("#efe3c8", alpha) },
      ],
    });
  });
  return ops;
}
