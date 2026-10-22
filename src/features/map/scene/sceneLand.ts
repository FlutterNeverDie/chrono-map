import type { LonLat, Terrain } from "./sceneData";

/**
 * 땅·물 판정(장면 지형의 10m 해안선·호수를 경위도 격자로 한 번 그려 둔 것, 칸 약 500m). 지형 지역(bbox) 밖은 땅으로 친다.
 * 병사가 물 위에 서지 않게 쓴다(배는 예외 - SceneLayer)
 */
const masks = new WeakMap<Terrain, (p: LonLat) => boolean>();
export function landMask(terrain: Terrain): (p: LonLat) => boolean {
  const hit = masks.get(terrain);
  if (hit) return hit;
  const [W, S, E, N] = terrain.bbox;
  const w = 2048;
  const h = Math.max(1, Math.round((w * (N - S)) / (E - W)));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const ring = (list: LonLat[][]) => {
    g.beginPath();
    for (const r of list)
      r.forEach(([lon, lat], i) => {
        const x = ((lon - W) / (E - W)) * w;
        const y = ((N - lat) / (N - S)) * h;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
    g.fill("evenodd");
  };
  g.fillStyle = "#fff";
  ring(terrain.land);
  g.fillStyle = "#000";
  ring(terrain.lakes);
  const px = g.getImageData(0, 0, w, h).data;
  const land = new Uint8Array(w * h);
  for (let i = 0; i < land.length; i++) land[i] = px[i * 4] > 127 ? 1 : 0;
  const is = ([lon, lat]: LonLat) => {
    if (lon < W || lon > E || lat < S || lat > N) return true;
    const x = Math.min(w - 1, Math.floor(((lon - W) / (E - W)) * w));
    const y = Math.min(h - 1, Math.floor(((N - lat) / (N - S)) * h));
    return land[y * w + x] === 1;
  };
  masks.set(terrain, is);
  return is;
}

/**
 * 물 위 점을 땅으로: 무리 가운데(home) 쪽으로 걸어가며 처음 만나는 땅에서, 물 위로 나간 거리의 절반만큼 더 안쪽에
 * (해안선에 한 줄로 늘어서지 않게 띠로). 가운데도 물이면 사방 16방향으로 가장 가까운 땅. 찾지 못하면 그대로
 */
export function toLand(
  is: (p: LonLat) => boolean,
  p: LonLat,
  home: LonLat,
  reach: number,
): LonLat {
  if (is(p)) return p;
  const dx = home[0] - p[0];
  const dy = home[1] - p[1];
  const steps = 48;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const q: LonLat = [p[0] + dx * k, p[1] + dy * k];
    if (is(q)) {
      const more = Math.min(1, k * 1.5);
      const r: LonLat = [p[0] + dx * more, p[1] + dy * more];
      return is(r) ? r : q;
    }
  }
  for (let ring = 1; ring <= 24; ring++) {
    const d = (reach * ring) / 8;
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const q: LonLat = [p[0] + Math.cos(ang) * d, p[1] + Math.sin(ang) * d];
      if (is(q)) return q;
    }
  }
  return p;
}

/** 땅 위 점을 물로(배 - toLand를 거꾸로: 무리 가운데 쪽으로 가며 처음 만나는 물, 없으면 가까운 물) */
export function toWater(
  is: (p: LonLat) => boolean,
  p: LonLat,
  home: LonLat,
  reach: number,
): LonLat {
  return toLand((q) => !is(q), p, home, reach);
}
