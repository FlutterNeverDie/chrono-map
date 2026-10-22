/**
 * 지형 고도(RMW terrain.mjs의 height.png - 16비트 회색, color·shade와 같은 메르카토르 격자)를 읽는다.
 * 브라우저 그림 해독은 8비트로 줄여 버려서 PNG를 직접 푼다(IDAT 모아 zlib 풀기 → 줄마다 필터 되돌리기).
 * 골짜기·능선·비탈·눈에만 쓰므로 가로·세로 절반(2×2 평균)으로 줄인다. GPU에는 half float(R16F - WebGL2 어디서나 거르기 됨)로,
 * 작은 단계(밉맵)는 여기서 만든다(R16F 밉맵 만들기는 렌더 대상 확장이 있어야 해서 기기마다 다르다)
 * 값: 고도 m = 원래 값 × scale - offset
 */
/** 단계마다 half 값(0번 = 원래 크기의 절반) */
export type Height = { levels: { w: number; h: number; data: Uint16Array }[] };

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice()]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** float32 → half(IEEE 754 binary16) 비트 */
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
export function toHalf(v: number): number {
  f32[0] = v;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  let exp = ((x >>> 23) & 0xff) - 127 + 15;
  let man = x & 0x7fffff;
  if (exp <= 0) {
    if (exp < -10) return sign;
    man = (man | 0x800000) >> (1 - exp);
    return sign | ((man + 0x1000) >> 13);
  }
  if (exp >= 31) return sign | 0x7c00;
  man += 0x1000;
  if (man & 0x800000) {
    man = 0;
    exp++;
    if (exp >= 31) return sign | 0x7c00;
  }
  return sign | (exp << 10) | (man >> 13);
}

export async function loadHeight(
  src: string,
  offset: number,
  scale: number,
): Promise<Height> {
  const buf = new Uint8Array(await (await fetch(src)).arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = 8;
  let w = 0;
  let h = 0;
  const idat: Uint8Array[] = [];
  while (p < buf.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(...buf.subarray(p + 4, p + 8));
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      w = dv.getUint32(p + 8);
      h = dv.getUint32(p + 12);
      const depth = body[8];
      const color = body[9];
      const interlace = body[12];
      if (depth !== 16 || color !== 0 || interlace !== 0)
        throw new Error(`height.png: 16비트 회색만(깊이 ${depth}, 색 ${color}, 인터레이스 ${interlace})`);
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const all = new Uint8Array(idat.reduce((s, b) => s + b.length, 0));
  let o = 0;
  for (const b of idat) {
    all.set(b, o);
    o += b.length;
  }
  const raw = await inflate(all);
  // 필터 되돌리기(한 점 2바이트)
  const stride = w * 2;
  const rows = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = rows.subarray(y * stride, (y + 1) * stride);
    const up = y ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= 2 ? cur[i - 2] : 0;
      const b = up ? up[i] : 0;
      const c = up && i >= 2 ? up[i - 2] : 0;
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
  }
  // 고도 m → 2×2 평균으로 줄여 가며 단계마다 half
  let cw = w;
  let ch = h;
  let cur = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    cur[i] = ((rows[i * 2] << 8) | rows[i * 2 + 1]) * scale - offset;
  const levels: Height["levels"] = [];
  while (cw > 1 || ch > 1) {
    const W = Math.max(1, cw >> 1);
    const H = Math.max(1, ch >> 1);
    const next = new Float32Array(W * H);
    const at = (x: number, y: number) => cur[Math.min(ch - 1, y) * cw + Math.min(cw - 1, x)];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        next[y * W + x] =
          (at(2 * x, 2 * y) + at(2 * x + 1, 2 * y) + at(2 * x, 2 * y + 1) + at(2 * x + 1, 2 * y + 1)) / 4;
    const data = new Uint16Array(W * H);
    for (let i = 0; i < data.length; i++) data[i] = toHalf(next[i]);
    levels.push({ w: W, h: H, data });
    cur = next;
    cw = W;
    ch = H;
  }
  return { levels };
}
