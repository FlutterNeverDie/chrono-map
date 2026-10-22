import {
  TO_FRAME,
  compile,
  setFrameUniforms,
  type GlView,
} from "@/components/map/gl/renderer";
import type { Ring, Shape } from "@/components/map/gl/polygons";
import type { Height } from "./sceneHeight";
import { spreadAt, type SpreadField, type SpreadItem } from "./sceneSpread";
import { alphaAt } from "./sceneData";

/**
 * 영상 장면 판(WebGL2, 개발 서버 ?scene 전용): 땅·바다·지형·나라 색·해안·강을 한 장에 그리고 마지막에 필름 마감을 건다.
 * 카메라 식은 사이트 WebGL 지도와 같다(TO_FRAME·frameMatrix - 판 위 자리 → 회전 → CSS와 같은 기울이기 행렬).
 *
 * 한 프레임: 다중 표본(MSAA) 판에
 *   하늘 → 바다 → [스텐실] 지형 상자·50m 땅·10m 땅·호수(짝홀 부채꼴 - 고리 방향과 상관없이 정확) → 상자 밖 50m 땅 색 →
 *   상자 안 지형(토지 피복 → Blender 시네마틱 팔레트, 산 음영 overlay) → 나라 색(지형 위면 곱하기) → 국경선 →
 *   해안 띠·해안선·호수 둘레·강(반투명 선은 따로 한 장에 MAX로 그려 겹친 마디가 진해지지 않게 얹는다)
 * → 한 장으로 풀어(resolve) 마감: 필름 곡선 → 바랜 톤(세피아 검정·크림 흰색) → 채도 → 비네트 → 입자(프레임 번호로 씨앗 고정).
 * 마감 순서·기본값은 RMW blender/post.py와 같다(같은 영상에서 시네마틱 장면과 붙어 나오므로).
 * 같은 입력이면 같은 그림(무작위는 정수 해시, 프레임마다 씨앗 고정). 캡처가 확실하게 읽도록 preserveDrawingBuffer
 */

/** 마감 값(RMW post.py와 같은 이름) - 장면 JSON "grade"로 덮어쓴다 */
export type Grade = {
  exposure: number;
  /** 필름 곡선(ACES, 흰색은 그대로 두도록 맞춤) 세기 0~1 */
  curve: number;
  lift: [number, number, number];
  white: [number, number, number];
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
};
export const GRADE: Grade = {
  exposure: 0,
  curve: 1,
  lift: [0.085, 0.068, 0.058],
  white: [0.975, 0.955, 0.905],
  contrast: 1,
  saturation: 0.82,
  vignette: 0.22,
  grain: 0.016,
};
/** 땅 팔레트(RMW blender/prep_terrain.py와 같은 이름·기본값) - 장면 JSON "palette"로 덮어쓴다 */
export type Palette = {
  steppe: string;
  steppe_dry: string;
  green: string;
  forest: string;
  rock: string;
  rock_dark: string;
  snow: string;
  water: string;
};
export const PALETTE: Palette = {
  steppe: "#d9cf9a",
  steppe_dry: "#d8c08e",
  green: "#91a774",
  forest: "#506b50",
  rock: "#9a8a76",
  rock_dark: "#6e6458",
  snow: "#f2eee4",
  water: "#7d9590",
};

/** 판 모양 값(테마·지형 여부) - 색은 [r,g,b,a] 0~1 sRGB */
export type SceneLook = {
  sky: number[];
  ocean: number[];
  land: number[];
  /** 지형이 있으면 나라 색을 곱하기로(지형이 비치게), 없으면 보통 덮기 */
  multiply: boolean;
  /** 나라 색·국경선을 그리는지(장면 "borders": false면 해안선만) */
  polities: boolean;
  /** 해안 채우기(km): 해안에서 이만큼 안쪽의 나라 없는 땅을 이웃 나라 색으로 - 국경 원본이 해안까지 오지 않아 해안을 따라 빈 띠가 생겼다. 0이면 끔 */
  coastFill: number;
  regionOpacity: number;
  border: { color: number[]; width: number };
  /** 해안선(선 여러 겹: 바다 쪽 띠·먹선) */
  coast: { color: number[]; width: number }[];
  relief: number;
  /** 눈 선(고도 m, prep_terrain.py 기본 3400) */
  snowline: number;
  /** 지형 땅 색: palette = Blender 팔레트로 다시 칠하기, css = 예전 SVG판 필터(sepia 0.2 saturate 0.82 brightness 0.9 contrast 1.15) */
  ground: "palette" | "css" | "raw";
  palette: number[][];
  greenness: number;
  grade: Grade | null;
};
export type SceneTerrain = {
  /** 지형 상자(지도 좌표, 경도 0 투영): 왼쪽 위·오른쪽 아래 */
  box: [number, number, number, number];
  color: TexImageSource;
  shade: TexImageSource;
  /** 고도(없으면 골짜기·능선·비탈·눈·물 깊이 없이) */
  height: Height | null;
  /** 원래 고도 격자 한 칸(경도 도) - 기울기 계산 */
  texDeg: [number, number];
  land: Ring[];
  lakes: Ring[];
  rivers: { line: Ring; width: number; color: number[] }[];
};

const MAP_VS = `#version 300 es
precision highp float;
in vec2 a_pos;
${TO_FRAME}
out vec2 v_map;
out vec2 v_p;
void main() {
  vec2 p = toFrame(a_pos);
  v_map = a_pos;
  v_p = p;
  gl_Position = u_m * vec4(p, 0.0, 1.0);
}`;
const FLAT_FS = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 o;
void main() { o = u_color; }`;

/** 지도 좌표 → 경위도(경도 0 메르카토르: 가로 1000 = 360°, 세로는 82°N에서 잰다) */
const GEO = `
const float PI = 3.14159265358979;
const float SCALE = 1000.0 / (2.0 * PI);
const float MERC82 = 2.6603061;
vec2 lonLat(vec2 m) {
  float lon = (m.x - 500.0) * 0.36;
  float lat = (2.0 * atan(exp(MERC82 - m.y / SCALE)) - PI * 0.5) * 180.0 / PI;
  return vec2(lon, lat);
}
// 정수 해시(GPU마다 같은 값 - sin 해시는 기기마다 달랐다)
uint hash3(uvec3 x) {
  x = x * 1664525u + 1013904223u;
  x.x += x.y * x.z; x.y += x.z * x.x; x.z += x.x * x.y;
  x ^= x >> 16u;
  x.x += x.y * x.z; x.y += x.z * x.x; x.z += x.x * x.y;
  return x.x ^ x.y ^ x.z;
}
float h01(ivec2 c, uint seed) { return float(hash3(uvec3(uvec2(c), seed)) >> 8u) / 16777216.0; }
float vnoise(vec2 p, uint seed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 c = ivec2(i);
  float a = h01(c, seed), b = h01(c + ivec2(1, 0), seed);
  float d = h01(c + ivec2(0, 1), seed), e = h01(c + ivec2(1, 1), seed);
  return mix(mix(a, b, u.x), mix(d, e, u.x), u.y);
}
float fbm(vec2 p, uint seed, int oct) {
  float acc = 0.0, amp = 1.0, tot = 0.0;
  for (int k = 0; k < 6; k++) {
    if (k >= oct) break;
    acc += amp * vnoise(p, seed * 31u + uint(k));
    tot += amp;
    amp *= 0.5;
    p *= 2.0;
  }
  return acc / tot;
}
vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
// 폭풍 바다(장면 storm): 큰 너울 그늘 + 바람결로 길게 흐르는 흰 물마루 - 땅 위 km 좌표에 붙어 time으로만 흐른다.
// 화면 1px보다 잘아지는 무늬는 옅게(넓게 본 지도에서 가물거리지 않게)
vec3 stormSea(vec3 col, vec2 m, float storm, float t) {
  if (storm <= 0.0) return col;
  vec2 ll = lonLat(m);
  vec2 km = vec2(ll.x * 111.32 * cos(radians(ll.y)), ll.y * 110.57);
  vec2 q = vec2(km.x / 2.5 + t * 0.35, km.y / 0.9);
  float fade = 1.0 - smoothstep(0.25, 0.9, max(fwidth(q.x), fwidth(q.y)));
  float swell = fbm(km / 12.0 + vec2(t * 0.06, 0.0), 73u, 3);
  col *= 1.0 - storm * (0.18 + 0.22 * swell);
  float caps = smoothstep(0.64, 0.78, fbm(q, 71u, 4)) * fade;
  return mix(col, vec3(0.86, 0.87, 0.84), caps * storm * 0.75);
}
`;

/** 지형: 토지 피복 → 팔레트(prep_terrain.py와 같은 식), 산 음영 overlay */
const TERRAIN_FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_map;
uniform sampler2D u_tc;
uniform sampler2D u_ts;
uniform vec4 u_box;
uniform float u_relief;
uniform int u_mode;
uniform vec3 u_pal[7];
uniform float u_greenness;
uniform sampler2D u_th;
uniform bool u_hasH;
uniform vec2 u_hSize;
uniform float u_snowline;
uniform float u_zoom;
uniform float u_cover;
uniform vec2 u_texDeg;
out vec4 o;
${GEO}
float sstep(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
vec3 cssFilm(vec3 c) {
  // sepia(0.2) saturate(0.82) brightness(0.9) contrast(1.15) - 예전 SVG판과 같은 행렬(Filter Effects 규격)
  float a = 0.8;
  mat3 sep = mat3(
    0.393 + 0.607 * a, 0.349 - 0.349 * a, 0.272 - 0.272 * a,
    0.769 - 0.769 * a, 0.686 + 0.314 * a, 0.534 - 0.534 * a,
    0.189 - 0.189 * a, 0.168 - 0.168 * a, 0.131 + 0.869 * a);
  c = sep * c;
  float s = 0.82;
  mat3 sat = mat3(
    0.213 + 0.787 * s, 0.213 - 0.213 * s, 0.213 - 0.213 * s,
    0.715 - 0.715 * s, 0.715 + 0.285 * s, 0.715 - 0.715 * s,
    0.072 - 0.072 * s, 0.072 - 0.072 * s, 0.072 + 0.928 * s);
  c = clamp(sat * c, 0.0, 1.0) * 0.9;
  return clamp((c - 0.5) * 1.15 + 0.5, 0.0, 1.0);
}
void main() {
  vec2 uv = (v_map - u_box.xy) / (u_box.zw - u_box.xy);
  vec3 lc = texture(u_tc, uv).rgb;
  // 산 음영은 팔레트에서 조금 흐리게(15″ 고도의 작은 골이 초원에 꼬불꼬불한 선으로 많이 보였다)
  float sh = u_mode == 1 ? texture(u_ts, uv, 0.8).r : texture(u_ts, uv).r;
  vec3 col;
  if (u_mode == 1) {
    // 땅 위 km 좌표(얼룩·붓 자국이 땅에 붙어 있게 - 카메라와 무관)
    vec2 ll = lonLat(v_map);
    vec2 km = vec2(ll.x * 111.32 * cos(radians(ll.y)), ll.y * 110.57);
    float blot = fbm(km / 25.0, 7u, 3);
    float fine = fbm(km / 1.2, 8u, 4);
    // 분류는 조금 흐린 토지 피복으로(작은 초록·숲 조각이 오려 붙인 스티커처럼 딱딱했다 - 작은 조각은 평야에 녹고 가장자리는 부드럽게)
    vec3 lcb = mix(texture(u_tc, uv, 3.0).rgb, texture(u_tc, uv, 1.2).rgb, 0.35);
    float gmr = (lcb.g - lcb.r) * 255.0;
    float green = clamp((gmr - 1.0) / 14.0, 0.0, 1.0);
    // 숲: 경계를 넓게 부드럽게(토지 피복 1/60° 칸이 지도에서는 얼룩무늬 덩어리로 보였다)
    // 숲: 더 흐린 표본에 넓은 문턱(좁은 문턱은 흐린 가장자리도 다시 칼같이 잘라 평야의 작은 숲이 오려 붙인 스티커처럼 보였다)
    vec3 lcf = texture(u_tc, uv, 4.0).rgb;
    float dark = sstep(0.0, 1.0, (226.0 - (lcf.r + lcf.g + lcf.b) / 3.0 * 255.0) / 60.0) *
                 sstep(0.0, 18.0, (lcf.g - lcf.r) * 255.0);
    float arid = clamp(-gmr / 8.0, 0.0, 1.0);
    float dry = clamp(0.35 + arid * 0.6 - green * 0.6 + (blot - 0.5) * 0.9, 0.0, 1.0);
    vec3 c = mix(u_pal[0], u_pal[1], dry);
    float veg = clamp(green * 1.1 + (blot - 0.5) * 0.4, 0.0, 1.0) * u_greenness;
    c = mix(c, u_pal[2], veg);
    // 숲 색은 세이지와 반씩(지도 거리에서 진한 숲 색이 위장 무늬처럼 튀었다 - 시네마틱도 먼 숲은 빛·공기로 옅다)
    c = mix(c, mix(u_pal[3], u_pal[2], 0.5), clamp(dark, 0.0, 1.0) * 0.7);
    float rockAmt = 0.0;
    if (u_hasH) {
      // 고도로(prep_terrain.py와 같은 순서): 골짜기 초록·능선 마름 → 비탈 바위 → 눈. 고도 칸은 약 0.9 km라 기울기가 실제보다 완만해
      // 바위 기준을 낮춘다
      float hc = texture(u_th, uv).r;
      vec2 tx = 1.0 / u_hSize;
      float cell = u_texDeg.x * 2.0 * 111320.0 * cos(radians(ll.y));
      float gx = (texture(u_th, uv + vec2(tx.x, 0.0)).r - texture(u_th, uv - vec2(tx.x, 0.0)).r) / (2.0 * cell);
      float gy = (texture(u_th, uv + vec2(0.0, tx.y)).r - texture(u_th, uv - vec2(0.0, tx.y)).r) / (2.0 * cell);
      float slope = degrees(atan(length(vec2(gx, gy))));
      // 골짜기·능선: 조금 흐린 고도로 재고 넘어가는 폭을 넓게(작은 골짜기 초록이 오려 붙인 스티커처럼 딱딱했다)
      float hm = textureLod(u_th, uv, 0.8).r;
      float cav = 0.5 * tanh((hm - textureLod(u_th, uv, 2.0).r) / 300.0)
                + 0.35 * tanh((hm - textureLod(u_th, uv, 3.5).r) / 1200.0);
      c = mix(c, u_pal[2], sstep(0.04, 0.7, -cav) * 0.5);
      c = mix(c, u_pal[1], sstep(0.04, 0.7, cav) * 0.4);
      float rockm = sstep(10.0, 24.0, slope + (fine - 0.5) * 10.0);
      c = mix(c, mix(u_pal[4], u_pal[5], fine * 0.5), rockm);
      rockAmt = rockm;
      // 눈: 흐린 고도와 섞어 봉우리 점들이 주능선을 따라 이어진 띠로 읽히게(멀리서 흰 점이 흩뿌려져 잡음 같았다), 무늬는 작게
      float hs = max(hc, mix(textureLod(u_th, uv, 1.5).r, textureLod(u_th, uv, 2.5).r, 0.5) + 250.0);
      float sn = sstep(u_snowline - 400.0, u_snowline + 300.0, hs + (blot - 0.5) * 250.0 + (fine - 0.5) * 120.0);
      sn *= sstep(58.0, 36.0, slope);
      c = mix(c, u_pal[6], clamp(sn, 0.0, 1.0));
    }
    // 겨울 눈(장면 winter.cover): 덮인 정도에 바람에 쓸린 얼룩, 숲은 나무가 비치고 가파른 바위는 덜 덮인다
    if (u_cover > 0.0) {
      // 얼룩은 크게(수십 km) + 잔물결 조금(잘면 위장 무늬처럼 보였다)
      float patchy = fbm(km / 30.0, 21u, 4) * 0.75 + fbm(km / 5.0, 22u, 3) * 0.25;
      float amt = sstep(0.0, 1.0, u_cover * 1.7 - 0.35 + (patchy - 0.5) * 0.9 + (fine - 0.5) * 0.15);
      amt *= 1.0 - clamp(dark, 0.0, 1.0) * 0.45;
      amt *= 1.0 - rockAmt * 0.55;
      c = mix(c, u_pal[6], amt);
    }
    // 1 km 붓 자국(아주 옅게 - 판판한 단색 면이 되지 않게)
    c *= 0.96 + 0.08 * fine;
    // 아주 가까이(배율 300~500에서 서서히): 흙 얼룩·풀결 잔무늬 - 땅에 붙은 무늬라 같은 t면 같은 그림.
    // 한 칸이 화면 1px보다 작아지는 잔무늬는 옅게(가물거리지 않게)
    float near = sstep(300.0, 500.0, u_zoom);
    if (near > 0.0) {
      vec2 m = km * 1000.0;
      // 흙 얼룩(약 400 m)·풀밭 덩어리(약 1.5 km)·바람결 풀결(160 × 40 m, 가로로 길게)
      float soil = fbm(m / 420.0, 11u, 3);
      float tuft = fbm(m / 1500.0, 14u, 2);
      vec2 g = vec2(m.x / 160.0, m.y / 40.0);
      float fade = 1.0 - sstep(0.35, 0.8, max(fwidth(g.x), fwidth(g.y)));
      float grass = vnoise(g, 12u) * 0.6 + vnoise(g * 2.1, 13u) * 0.4;
      c = mix(c, u_pal[2], near * clamp((tuft - 0.5) * 2.2, 0.0, 1.0) * 0.35);
      c = mix(c, u_pal[1], near * clamp((0.5 - tuft) * 2.2, 0.0, 1.0) * 0.3);
      c *= 1.0 + near * ((soil - 0.5) * 0.3 + (grass - 0.5) * 0.2 * fade);
    }
    col = toSrgb(c);
  } else if (u_mode == 0) {
    col = cssFilm(lc);
  } else {
    col = lc;
  }
  // 산 음영(회색 128 = 평지), 세기 u_relief: 팔레트는 그늘을 바랜 세피아로·볕을 크림으로(시네마틱의 해 그림자처럼), 예전 판은 overlay
  if (u_mode == 1) {
    float l = (sh - 0.5) * 2.0;
    // 아주 작은 기울기는 평지로(초원의 잔 음영 잡음)
    l = sign(l) * max(0.0, abs(l) - 0.05) / 0.95;
    vec3 shadow = col * vec3(0.58, 0.49, 0.41);
    vec3 sun = mix(col, vec3(0.985, 0.955, 0.87), 0.55);
    col = l < 0.0 ? mix(col, shadow, min(1.0, -l * 1.25) * u_relief) : mix(col, sun, l * u_relief * 0.6);
    o = vec4(col, 1.0);
  } else {
    vec3 ov = mix(2.0 * col * sh, 1.0 - 2.0 * (1.0 - col) * (1.0 - sh), step(0.5, col));
    o = vec4(mix(col, ov, u_relief), 1.0);
  }
}`;

/** 바다(폭풍이면 너울·흰 물마루) */
const OCEAN_FS = `#version 300 es
precision highp float;
in vec2 v_map;
uniform vec4 u_color;
uniform float u_storm;
uniform float u_time;
out vec4 o;
${GEO}
void main() {
  o = vec4(stormSea(u_color.rgb, v_map, u_storm, u_time), 1.0);
}`;

/** 지형 상자 안 물: 얕은 바다는 조금 밝고 푸르게(고도가 있을 때, 호수 수면처럼 0 위는 그대로) */
const WATER_FS = `#version 300 es
precision highp float;
in vec2 v_map;
uniform sampler2D u_th;
uniform vec4 u_box;
uniform vec4 u_color;
uniform float u_storm;
uniform float u_time;
out vec4 o;
${GEO}
void main() {
  vec2 uv = (v_map - u_box.xy) / (u_box.zw - u_box.xy);
  float h = texture(u_th, uv).r;
  float shallow = smoothstep(-60.0, -3.0, h) * step(h, -0.5);
  vec3 c = mix(u_color.rgb, u_color.rgb * 1.12 + vec3(0.015, 0.03, 0.02), shallow * 0.6);
  o = vec4(stormSea(c, v_map, u_storm, u_time), 1.0);
}`;

/** 나라 색: 정점마다 [r,g,b,진하기]. 곱하기면 1 → 색으로 진하기만큼(blend DST_COLOR, ZERO) */
const POLITY_VS = `#version 300 es
precision highp float;
in vec2 a_pos;
in vec4 a_col;
${TO_FRAME}
out vec4 v_col;
void main() {
  v_col = a_col;
  gl_Position = u_m * vec4(toFrame(a_pos), 0.0, 1.0);
}`;
const POLITY_FS = `#version 300 es
precision highp float;
in vec4 v_col;
uniform bool u_mul;
uniform float u_alpha;
out vec4 o;
void main() {
  float a = v_col.a * u_alpha;
  o = u_mul ? vec4(mix(vec3(1.0), v_col.rgb, a), 1.0) : vec4(v_col.rgb * a, a);
}`;

/**
 * 영역 번지기(장면 spread): 다음 영역 삼각형을 "앞 영역에서의 거리"(u_dist, 0~1)가 문턱 u_r보다 가까운 곳만 칠한다.
 * 앞쪽 가장자리는 잡음으로 굴곡(앞 영역 안쪽은 굴곡 없음), 바로 뒤는 먹이 스민 띠(진하게 → 안쪽으로 바래며 나라 색).
 * u_r < 0이면 거리 없이 다 칠한다(앞 영역·마지막 영역)
 */
const SPREAD_FS = `#version 300 es
precision highp float;
in vec2 v_map;
${GEO}
uniform sampler2D u_dist;
uniform vec4 u_box;
uniform float u_r;
uniform float u_rough;
uniform vec4 u_col;
uniform vec3 u_ink;
uniform bool u_mul;
uniform float u_alpha;
out vec4 o;
void main() {
  float a = u_alpha;
  vec3 col = u_col.rgb;
  if (u_r >= 0.0) {
    vec2 uv = (v_map - u_box.xy) / (u_box.zw - u_box.xy);
    float d = texture(u_dist, uv).r;
    // 굴곡: 큰 물결 + 잔물결(상자 가로세로 비율 그대로 - 늘어나지 않게)
    vec2 q = uv * vec2((u_box.z - u_box.x) / (u_box.w - u_box.y), 1.0);
    float n = (fbm(q * 6.0, 41u, 5) - 0.5) * 2.0;
    float amp = 0.08 * u_rough * smoothstep(0.0, 0.06, d);
    float front = u_r * (1.0 + 0.1 * u_rough + 0.02) - (d + n * amp);
    float px = fwidth(d) + 1e-6;
    if (front < -px) discard;
    float edge = smoothstep(-px, px, front);
    // 먹 스밈 띠(앞 영역 밖에서만, 번지는 동안만)
    float wet = (1.0 - smoothstep(0.0, 0.04, front)) * smoothstep(0.0, 0.01, d)
      * step(1e-4, u_r) * (1.0 - smoothstep(0.96, 1.0, u_r));
    col = mix(col, u_ink, wet * 0.6);
    a = mix(a, max(a, 0.55), wet) * edge;
  }
  o = u_mul ? vec4(mix(vec3(1.0), col, a), 1.0) : vec4(col * a, a);
}`;

/** 선: 선분마다 둥근 끝 캡슐(거리로 가장자리를 부드럽게 - 기울여도 화면 1px로) */
const LINE_VS = `#version 300 es
precision highp float;
in vec2 a_corner;
in vec4 a_seg;
in float a_w;
in vec4 a_col;
in float a_start;      // 꺾은선 처음부터 이 선분 시작까지 길이(지도 단위) - 점선·흔들림이 선을 따라 이어지게
${TO_FRAME}
uniform float u_wobble; // 흔들림 폭(px)
uniform float u_wOverride; // 0보다 크면 모든 선분을 이 굵기(px)로(해안 채우기 - 배율마다 땅 위 거리로 맞춘다)
out vec2 v_p;
out vec4 v_ab;
out float v_w;
out vec4 v_col;
out float v_start;
void main() {
  vec2 a = toFrame(a_seg.xy);
  vec2 b = toFrame(a_seg.zw);
  vec2 d = b - a;
  float len = length(d);
  vec2 dir = len > 1e-6 ? d / len : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  float w = u_wOverride > 0.0 ? u_wOverride : a_w;
  float h = w * 0.5 + 1.5 + u_wobble;
  vec2 p = (a + b) * 0.5 + dir * a_corner.x * (len * 0.5 + h) + n * a_corner.y * h;
  v_p = p;
  v_ab = vec4(a, b);
  v_w = w;
  v_col = a_col;
  v_start = a_start;
  gl_Position = u_m * vec4(p, 0.0, 1.0);
}`;
const LINE_FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_p;
in vec4 v_ab;
in float v_w;
in vec4 v_col;
in float v_start;
uniform bool u_mul;
uniform vec2 u_dash;      // 칠한 길이·빈 길이(px), 0이면 실선
uniform float u_pxPerUnit; // 지도 1단위 = 판 위 px
uniform float u_wobble;
uniform float u_alpha;
uniform vec4 u_tint;      // 색 바꾸기(얼어붙은 강 - a만큼 이 색으로)
out vec4 o;
${GEO}
void main() {
  vec2 pa = v_p - v_ab.xy;
  vec2 ba = v_ab.zw - v_ab.xy;
  float bl = length(ba);
  vec2 dir = bl > 1e-6 ? ba / bl : vec2(1.0, 0.0);
  // 선을 따라 잰 길이(px) - 흔들림·점선이 선분이 바뀌어도 이어진다
  float s = v_start * u_pxPerUnit + clamp(dot(pa, dir), 0.0, bl);
  vec2 q = pa;
  if (u_wobble > 0.0) {
    // 손으로 그린 먹선: 선을 따라 천천히 옆으로 흔들린다(약 20px 주기, 정수 해시라 같은 그림)
    float off = (vnoise(vec2(s / 20.0, 0.5), 5u) - 0.5) * 2.0 * u_wobble;
    q -= vec2(-dir.y, dir.x) * off;
  }
  float k = clamp(dot(q, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0);
  float d = length(q - ba * k);
  if (u_dash.x > 0.0 && mod(s, u_dash.x + u_dash.y) > u_dash.x) discard;
  float aa = max(fwidth(d), 1e-4);
  float cov = clamp((v_w * 0.5 - d) / aa + 0.5, 0.0, 1.0);
  // 1px보다 가는 선은 굵기 대신 옅게(가는 선이 끊겨 보이지 않게)
  cov *= min(1.0, v_w / aa);
  // 덮지 않는 곳은 버린다(스텐실을 쓰는 해안 채우기가 캡슐 밖 네모 귀퉁이까지 차지하지 않게)
  if (cov <= 0.001) discard;
  float a = v_col.a * cov * u_alpha;
  vec3 lc = mix(v_col.rgb, u_tint.rgb, u_tint.a);
  o = u_mul ? vec4(mix(vec3(1.0), lc, a), 1.0) : vec4(lc * a, a);
}`;

/** 화면 전체 네모(하늘·합치기·마감) */
const SCREEN_VS = `#version 300 es
precision highp float;
in vec2 a_corner;
out vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  gl_Position = vec4(a_corner, 0.0, 1.0);
}`;
const SKY_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec4 u_top;
uniform vec4 u_bottom;
out vec4 o;
void main() { o = mix(u_bottom, u_top, v_uv.y); }`;
const COPY_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_img;
out vec4 o;
void main() { o = texture(u_img, v_uv); }`;
/** 가우스 흐림 한 방향(9탭) - u_step = 텍셀 간격 × 방향 */
const BLUR_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_img;
uniform vec2 u_step;
out vec4 o;
void main() {
  const float w[5] = float[5](0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);
  vec4 c = texture(u_img, v_uv) * w[0];
  for (int i = 1; i < 5; i++) {
    c += texture(u_img, v_uv + u_step * float(i)) * w[i];
    c += texture(u_img, v_uv - u_step * float(i)) * w[i];
  }
  o = c;
}`;
/**
 * 지역 강조(장면 focus): 흐린 가림막 m(0~u_peak, 강조할 곳 안쪽이 보이는 정도만큼)으로 - 바깥은 흐린 그림으로 바꾸며 어둡고 채도를
 * 낮추고(u_dim), 가장자리를 따라 은은한 빛 띠와 안쪽 살짝 밝게(u_glow). 마감(필름) 전에
 */
const FOCUS_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_img;
uniform sampler2D u_blur;
uniform sampler2D u_mask;
uniform float u_peak;
uniform float u_dim;
uniform float u_glow;
out vec4 o;
void main() {
  vec3 c = texture(u_img, v_uv).rgb;
  vec3 b = texture(u_blur, v_uv).rgb;
  float m = texture(u_mask, v_uv).r;
  // 바깥(강조 정도 - 그 자리 안쪽 정도)
  float out_ = clamp(u_peak - m, 0.0, 1.0) * u_dim;
  float g = dot(b, vec3(0.299, 0.587, 0.114));
  vec3 dimmed = mix(vec3(g), b, 0.45) * 0.55;
  c = mix(c, dimmed, out_);
  // 가장자리 빛 띠(m이 0.5 언저리) + 안쪽 살짝 밝게
  float k = u_peak > 0.0 ? m / u_peak : 0.0;
  float ring = clamp(1.0 - abs(k - 0.5) * 2.0, 0.0, 1.0);
  c += vec3(0.95, 0.85, 0.62) * ring * ring * 0.15 * u_glow * u_peak;
  // 안쪽은 따뜻하게 살짝 밝게(테두리만 빛나면 화면 장치처럼 보였다)
  c = mix(c, c * 1.1 + vec3(0.05, 0.035, 0.0), k * u_glow * u_peak * 0.7);
  o = vec4(c, 1.0);
}`;
const GRADE_FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
uniform sampler2D u_img;
uniform bool u_on;
uniform float u_exposure;
uniform float u_curve;
uniform vec3 u_lift;
uniform vec3 u_white;
uniform float u_contrast;
uniform float u_sat;
uniform float u_vig;
uniform float u_grain;
uniform uint u_seed;
uniform vec2 u_size;
uniform float u_fall;
uniform float u_time;
uniform float u_wind;
uniform float u_storm;
uniform bool u_lightning;
uniform float u_swind;
out vec4 o;
${GEO}
/**
 * 폭풍 비·번개(장면 storm): 화면이 어두워지고(먹구름), 가늘고 긴 비 줄기 겹 셋이 바람에 비껴 빠르게 내리고, 가끔 번개로 번쩍
 * (1.3초 칸마다 씨앗으로 정함 - 같은 t면 같은 때, 두 번 깜빡이며 빨리 사그라짐)
 */
vec3 stormSky(vec3 y) {
  float px = u_size.y / 1440.0;
  y *= 1.0 - 0.32 * u_storm;
  y = mix(y, vec3(dot(y, vec3(0.3, 0.59, 0.11))), 0.25 * u_storm);
  vec2 dir = normalize(vec2(u_swind, -1.0));
  vec2 side = vec2(-dir.y, dir.x);
  for (int L = 0; L < 3; L++) {
    float cs = (L == 0 ? 60.0 : L == 1 ? 38.0 : 24.0) * px;
    float speed = (L == 0 ? 2400.0 : L == 1 ? 1700.0 : 1100.0) * px;
    float len = (L == 0 ? 70.0 : L == 1 ? 45.0 : 28.0) * px;
    float wid = (L == 0 ? 1.4 : L == 1 ? 1.0 : 0.8) * px;
    vec2 q = gl_FragCoord.xy - dir * speed * u_time;
    // 줄기 방향 좌표로 칸을 나눈다(길쭉한 칸)
    vec2 r = vec2(dot(q, side), dot(q, dir));
    vec2 cell = floor(r / vec2(cs, cs * 3.0));
    for (int dy = -1; dy <= 1; dy++) {
      ivec2 c = ivec2(cell) + ivec2(0, dy);
      if (h01(c, 81u + uint(L)) > 0.25 + 0.5 * u_storm) continue;
      vec2 ctr = (vec2(c) + vec2(0.2 + 0.6 * h01(c, 82u + uint(L)), 0.5)) * vec2(cs, cs * 3.0);
      vec2 dv = r - ctr;
      float a = smoothstep(wid * 1.5, 0.0, abs(dv.x)) * smoothstep(len, len * 0.3, abs(dv.y));
      y = mix(y, vec3(0.8, 0.82, 0.83), a * (0.22 + 0.08 * float(L)) * u_storm);
    }
  }
  if (u_lightning) {
    float slot = floor(u_time / 1.3);
    if (h01(ivec2(int(slot), 7), 91u) < 0.3 * u_storm) {
      float k = (u_time - slot * 1.3) / 1.3;
      float at = 0.2 + 0.5 * h01(ivec2(int(slot), 8), 92u);
      float dt = (k - at) * 1.3;
      float flash = dt < 0.0 ? 0.0 : exp(-dt * 16.0) + 0.6 * exp(-max(0.0, dt - 0.12) * 20.0) * step(0.12, dt);
      y = mix(y, vec3(0.95, 0.95, 1.0), clamp(flash, 0.0, 1.0) * 0.5);
    }
  }
  return y;
}
/**
 * 내리는 눈(장면 winter.fall): 화면에 겹 셋(먼 것은 작고 느리고 옅게) - 칸마다 씨앗으로 송이를 두고 time으로만 흘러 같은 프레임은
 * 같은 그림. 바람(u_wind)만큼 옆으로 비껴 내리고 송이마다 천천히 좌우로 흔들린다. 크기는 화면 높이 1440 기준 px
 */
vec3 snowfall(vec3 y) {
  float px = u_size.y / 1440.0;
  // 눈 오는 공기: 화면이 살짝 뿌옇고 먼 쪽(위)일수록 더(맑은 날처럼 또렷하면 눈송이만 붙인 것처럼 어색했다)
  y = mix(y, vec3(0.84, 0.84, 0.82), u_fall * (0.1 + 0.16 * v_uv.y));
  // 떨어지는 방향(바람만큼 기울어짐)
  vec2 fallDir = normalize(vec2(u_wind, -1.0));
  vec2 side = vec2(-fallDir.y, fallDir.x);
  for (int L = 0; L < 4; L++) {
    // 겹: 0 = 가장 가까움(크고 흐릿하고 빠름) … 3 = 가장 멂(작고 느림)
    float cs = (L == 0 ? 120.0 : L == 1 ? 70.0 : L == 2 ? 44.0 : 28.0) * px;
    float speed = (L == 0 ? 200.0 : L == 1 ? 130.0 : L == 2 ? 85.0 : 55.0) * px;
    float rad = (L == 0 ? 5.5 : L == 1 ? 3.2 : L == 2 ? 2.0 : 1.3) * px;
    float op = L == 0 ? 0.55 : L == 1 ? 0.6 : L == 2 ? 0.5 : 0.38;
    float soft = L == 0 ? 0.05 : 0.3;
    vec2 q = gl_FragCoord.xy - fallDir * speed * u_time;
    vec2 cell = floor(q / cs);
    for (int dx = -1; dx <= 1; dx++) {
      for (int dy = -1; dy <= 1; dy++) {
        ivec2 c = ivec2(cell) + ivec2(dx, dy);
        float r1 = h01(c, 31u + uint(L));
        // 칸마다 송이가 있을 확률(촘촘하면 정지 화면에서 물방울 무늬처럼 보였다)
        if (r1 > 0.12 + 0.38 * u_fall) continue;
        float r2 = h01(c, 41u + uint(L));
        float r3 = h01(c, 51u + uint(L));
        float r4 = h01(c, 61u + uint(L));
        vec2 ctr = (vec2(c) + vec2(0.15 + 0.7 * r2, 0.15 + 0.7 * r3)) * cs;
        ctr += side * sin(u_time * (0.7 + r2) + r3 * 6.283) * cs * 0.12;
        vec2 dv = q - ctr;
        // 떨어지는 방향으로 조금만 길게(가까운 겹일수록) - 둥근 점만 있으면 내리는 느낌이 없었고, 길면 비처럼 보였다
        float along = dot(dv, fallDir);
        float across = dot(dv, side);
        float stretch = 1.0 + speed / (450.0 * px);
        float d = length(vec2(across, along / stretch));
        float rr = rad * (0.6 + 0.8 * r4);
        float a = smoothstep(rr * (1.3 + soft * 4.0), rr * soft, d) * op * (0.6 + 0.4 * r2);
        y = mix(y, vec3(0.98, 0.97, 0.95), a * clamp(u_fall * 1.25, 0.0, 1.0));
      }
    }
  }
  return y;
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float white(ivec2 p) { return float(hash3(uvec3(uvec2(p), u_seed)) >> 8u) / 16777216.0; }
void main() {
  vec3 y = texture(u_img, v_uv).rgb;
  if (u_storm > 0.0) y = stormSky(y);
  if (u_fall > 0.0) y = snowfall(y);
  if (!u_on) { o = vec4(y, 1.0); return; }
  // 필름 곡선: 선형으로 펴서 노출 → ACES(post.py와 같은 x 0.8) - 지도는 이미 화면 색이라 흰색 1이 1로 남게 나눠 맞춘다
  vec3 lin = toLin(y) * exp2(u_exposure);
  vec3 f = aces(lin * 0.8) / aces(vec3(0.8));
  y = toSrgb(mix(lin, f, u_curve));
  if (u_contrast != 1.0) y = clamp(0.5 + (y - 0.5) * u_contrast, 0.0, 1.0);
  // 바랜 톤: 검정은 세피아로 들어 올리고 흰색은 크림으로
  y = u_lift + (u_white - u_lift) * y;
  float lum = dot(y, vec3(0.2126, 0.7152, 0.0722));
  y = lum + (y - lum) * u_sat;
  // 비네트(post.py와 같은 거리 - 가로·세로를 각각 반 폭으로 나눔)
  vec2 q = (v_uv - 0.5) * 2.0;
  float r = length(q) / 1.414;
  y *= 1.0 - u_vig * pow(r, 2.2);
  // 입자: 픽셀마다 정규 분포에 가깝게(4개 합) + 이웃과 살짝 섞음(post.py의 0.65px 흐림), 밝기 가운데에서 가장 세게
  ivec2 p = ivec2(gl_FragCoord.xy);
  float n = 0.0;
  for (int k = 0; k < 5; k++) {
    ivec2 d = k == 0 ? ivec2(0) : k == 1 ? ivec2(1, 0) : k == 2 ? ivec2(-1, 0) : k == 3 ? ivec2(0, 1) : ivec2(0, -1);
    ivec2 c = p + d;
    float g = white(c * 4) + white(c * 4 + 1) + white(c * 4 + 2) + white(c * 4 + 3) - 2.0;
    n += g * (k == 0 ? 0.5 : 0.125);
  }
  n /= 0.559 * 0.5774;
  y += u_grain * n * (0.35 + 0.65 * sqrt(clamp(lum * (1.0 - lum) * 4.0, 0.0, 1.0)));
  o = vec4(clamp(y, 0.0, 1.0), 1.0);
}`;

type Prog = ReturnType<typeof compile>;
type Mesh = { vao: WebGLVertexArrayObject; bufs: WebGLBuffer[]; count: number };

/** 고리들 → 부채꼴 삼각형(스텐실 짝홀용) */
function fans(rings: Ring[]): { pos: Float32Array; idx: Uint32Array } {
  let n = 0;
  let t = 0;
  for (const r of rings) {
    n += r.length;
    t += Math.max(0, r.length - 2);
  }
  const pos = new Float32Array(n * 2);
  const idx = new Uint32Array(t * 3);
  let v = 0;
  let k = 0;
  for (const r of rings) {
    const base = v;
    for (const [x, y] of r) {
      pos[v * 2] = x;
      pos[v * 2 + 1] = y;
      v++;
    }
    for (let i = 1; i < r.length - 1; i++) {
      idx[k++] = base;
      idx[k++] = base + i;
      idx[k++] = base + i + 1;
    }
  }
  return { pos, idx };
}

/** 지도 좌표 y(경도 0 메르카토르) → 위도(라디안) */
const latOfY = (y: number) =>
  2 * Math.atan(Math.exp(2.6603061 - (y * 2 * Math.PI) / 1000)) - Math.PI / 2;

/** 눈 색(지형 밖 땅을 덮을 때 - 크림빛 흰색), 얼음 색(언 호수·강 - 바랜 회청 흰색) */
const SNOW_RGB = [0.93, 0.92, 0.89];
const ICE_RGB = [0.8, 0.84, 0.86];

/** 먹선 색 #2b1d14(sceneArt INK - 나라 색과 같은 화면 색 공간) */
const INK_RGB = [0x2b / 255, 0x1d / 255, 0x14 / 255];

/** 스텐실 비트 */
const S_LAND10 = 0x01;
const S_LAKE = 0x02;
const S_BOX = 0x04;
const S_LAND50 = 0x08;
const S_LAND = 0x10;

export class SceneRenderer {
  private gl: WebGL2RenderingContext;
  private map: Prog;
  private flat: Prog;
  private terrainP: Prog;
  private waterP: Prog;
  private oceanP: Prog;
  private polity: Prog;
  private spreadP: Prog;
  /** 영역 번지기: 항목 + 도형마다 삼각형·거리 격자마다 텍스처 */
  private spread: SpreadItem[] = [];
  private spreadMesh = new Map<object, Mesh>();
  private spreadTex = new Map<SpreadField, WebGLTexture>();
  /** 지역 강조: 도형(삼각형)·보이는 구간·모양 */
  private focus: { mesh: Mesh; show: number[]; dim: number; glow: number }[] = [];
  private blurP: Prog;
  private focusP: Prog;
  private fx: {
    w: number;
    h: number;
    tex: WebGLTexture[];
    fbo: WebGLFramebuffer[];
    out: WebGLTexture;
    outFbo: WebGLFramebuffer;
  } | null = null;
  /** 지금 그리는 시각(spread용 - SceneGl이 그리기 전에 넣는다) */
  private time = 0;
  private line: Prog;
  private sky: Prog;
  private copy: Prog;
  private grade: Prog;
  private quad: WebGLBuffer;
  private quadVao: WebGLVertexArrayObject;
  private lineCorner: WebGLBuffer;
  private rect: { buf: WebGLBuffer; vao: WebGLVertexArrayObject };
  private land50: Mesh | null = null;
  private coast50: Ring[] = [];
  private polities: Mesh | null = null;
  /** 겨울(장면 winter): 눈 덮임·내리는 눈·얼음·바람 - 그릴 때마다 SceneGl이 넣는다 */
  private winter = { cover: 0, fall: 0, frozen: false, wind: 0.3 };
  /** 폭풍(장면 storm): 세기·번개·바람 */
  private storm = { strength: 0, lightning: true, wind: 0.6 };
  setStorm(s: { strength: number; lightning: boolean; wind: number }) {
    this.storm = s;
  }
  /** 타임랩스: 다음 해 국경(칠·선)과 섞는 정도 */
  private next: { fill: Mesh; lines: Mesh } | null = null;
  private yearMix = 0;
  private borders: Mesh | null = null;
  /** 해안 채우기용: 나라마다 테두리를 나라 색으로 */
  private grow: Mesh | null = null;
  /** 해안 채우기용: 해안선(가까운 곳 표시) */
  private coastMask: Mesh | null = null;
  private terrain: {
    box: [number, number, number, number];
    land: Mesh;
    lakes: Mesh;
    tc: WebGLTexture;
    ts: WebGLTexture;
    th: WebGLTexture | null;
    hSize: [number, number];
    texDeg: [number, number];
    lines: Mesh[];
  } | null = null;
  private coastLines: Mesh[] = [];
  /** 판 층(그 시각의 칠한 곳·선 - 그릴 때마다 바뀐다) */
  private plane: (
    | { kind: "fill"; mesh: Mesh; box: [number, number, number, number]; color: number[] }
    | { kind: "lines"; mesh: Mesh; dash?: [number, number]; wobble: boolean }
  )[] = [];
  /** 화면 층(대군·부대·깃발·화살표·먼지·안개를 구운 한 장) - 마감 전에 얹는다 */
  private overlay: WebGLTexture | null = null;
  private hasOverlay = false;
  private look: SceneLook | null = null;
  private fb: {
    w: number;
    h: number;
    msaa: WebGLFramebuffer;
    color: WebGLRenderbuffer;
    depth: WebGLRenderbuffer;
    resolve: WebGLFramebuffer;
    tex: WebGLTexture;
    layer: WebGLFramebuffer;
    layerTex: WebGLTexture;
  } | null = null;
  private samples: number;
  private aniso: number;
  private anisoExt: EXT_texture_filter_anisotropic | null;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      // 캡처(스크린샷·readPixels)가 그린 그림을 확실히 읽게
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 없음");
    this.gl = gl;
    this.map = compile(gl, MAP_VS, FLAT_FS);
    this.flat = this.map;
    this.terrainP = compile(gl, MAP_VS, TERRAIN_FS);
    this.waterP = compile(gl, MAP_VS, WATER_FS);
    this.oceanP = compile(gl, MAP_VS, OCEAN_FS);
    this.polity = compile(gl, POLITY_VS, POLITY_FS);
    this.spreadP = compile(gl, MAP_VS, SPREAD_FS);
    this.blurP = compile(gl, SCREEN_VS, BLUR_FS);
    this.focusP = compile(gl, SCREEN_VS, FOCUS_FS);
    this.line = compile(gl, LINE_VS, LINE_FS);
    this.sky = compile(gl, SCREEN_VS, SKY_FS);
    this.copy = compile(gl, SCREEN_VS, COPY_FS);
    this.grade = compile(gl, SCREEN_VS, GRADE_FS);
    this.samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number);
    this.anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");
    this.aniso = this.anisoExt
      ? Math.min(
          8,
          gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number,
        )
      : 0;
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    this.quadVao = gl.createVertexArray()!;
    for (const p of [this.sky, this.copy, this.grade, this.blurP, this.focusP]) {
      const loc = gl.getAttribLocation(p.p, "a_corner");
      gl.bindVertexArray(this.quadVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    this.lineCorner = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineCorner);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    // 지도 좌표 네모(바다·덮기) - 그릴 때마다 채운다
    const rbuf = gl.createBuffer()!;
    const rvao = gl.createVertexArray()!;
    gl.bindVertexArray(rvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, rbuf);
    const loc = gl.getAttribLocation(this.map.p, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.rect = { buf: rbuf, vao: rvao };
  }

  private dropMesh(m: Mesh | null) {
    if (!m) return;
    for (const b of m.bufs) this.gl.deleteBuffer(b);
    this.gl.deleteVertexArray(m.vao);
  }
  /** 위치만 있는 삼각형 묶음(지도 좌표) */
  private makeFan(rings: Ring[]): Mesh {
    const gl = this.gl;
    const { pos, idx } = fans(rings);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    for (const p of [this.map, this.terrainP]) {
      const loc = gl.getAttribLocation(p.p, "a_pos");
      if (loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, bufs: [vb, ib], count: idx.length };
  }
  /** 선분들(지도 좌표) - 선분마다 굵기(px)·색(곱하기가 아니면 미리 곱한 알파 아님: [r,g,b,a]) */
  private makeLines(
    list: { line: Ring; width: number; color: number[]; closed?: boolean }[],
  ): Mesh {
    const gl = this.gl;
    const data: number[] = [];
    for (const { line, width, color, closed } of list) {
      let start = 0;
      const push = (a: [number, number], b: [number, number]) => {
        data.push(a[0], a[1], b[0], b[1], width, ...color.slice(0, 3), color[3] ?? 1, start);
        start += Math.hypot(b[0] - a[0], b[1] - a[1]);
      };
      for (let i = 0; i < line.length - 1; i++) push(line[i], line[i + 1]);
      if (closed && line.length > 2) {
        const a = line[line.length - 1];
        const b = line[0];
        if (a[0] !== b[0] || a[1] !== b[1]) push(a, b);
      }
    }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineCorner);
    const c = gl.getAttribLocation(this.line.p, "a_corner");
    gl.enableVertexAttribArray(c);
    gl.vertexAttribPointer(c, 2, gl.FLOAT, false, 0, 0);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const attr = (name: string, n: number, off: number) => {
      const loc = gl.getAttribLocation(this.line.p, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 40, off);
      gl.vertexAttribDivisor(loc, 1);
    };
    attr("a_seg", 4, 0);
    attr("a_w", 1, 16);
    attr("a_col", 4, 20);
    attr("a_start", 1, 36);
    gl.bindVertexArray(null);
    return { vao, bufs: [buf], count: data.length / 10 };
  }

  /** 판 층 도형(scenePlane의 planeOps - 점선이 있는 묶음은 점선 하나로 같이 그린다) */
  setPlane(
    ops: (
      | { kind: "fill"; rings: Ring[]; color: number[] }
      | {
          kind: "lines";
          list: { line: Ring; width: number; color: number[]; dash?: [number, number] }[];
          wobble: boolean;
        }
    )[],
  ) {
    for (const p of this.plane) this.dropMesh(p.mesh);
    this.plane = ops.map((op) => {
      if (op.kind === "fill") {
        const xs = op.rings.flat().map((p) => p[0]);
        const ys = op.rings.flat().map((p) => p[1]);
        return {
          kind: "fill" as const,
          mesh: this.makeFan(op.rings),
          box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as [number, number, number, number],
          color: op.color,
        };
      }
      return {
        kind: "lines" as const,
        mesh: this.makeLines(op.list),
        dash: op.list.find((l) => l.dash)?.dash,
        wobble: op.wobble,
      };
    });
  }
  /** 화면 층 한 장(기기 px 크기, 미리 곱하지 않은 알파) - null이면 없음 */
  setOverlay(img: TexImageSource | null) {
    const gl = this.gl;
    this.hasOverlay = !!img;
    if (!img) return;
    this.overlay ??= gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.overlay);
    // 캔버스는 위가 0번 줄 - 화면 네모(아래가 0)에 맞게 뒤집어 올린다
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  setLook(look: SceneLook) {
    this.look = look;
    this.rebuildCoast();
  }
  /** 50m 해안선 고리(지도 좌표, 닫힌 고리) - 지형 상자 밖 땅·지형이 없는 장면의 해안 */
  setLand50(rings: Ring[]) {
    this.dropMesh(this.land50);
    this.land50 = this.makeFan(rings);
    this.coast50 = rings;
    this.rebuildCoast();
  }
  setWinter(w: { cover: number; fall: number; frozen: boolean; wind: number }) {
    this.winter = w;
  }
  /** 겨울이면 지형 밖 땅도 눈 색 쪽으로(덮인 정도만큼) */
  private winterLand(land: number[]) {
    const k = this.winter.cover * 0.85;
    if (k <= 0) return land;
    return land.map((v, i) => (i < 3 ? v + (SNOW_RGB[i] - v) * k : v));
  }
  /** 그릴 시각(영역 번지기) */
  setTime(t: number) {
    this.time = t;
  }
  /**
   * 지역 강조 항목: 도형(삼각형) + show(보이는 구간, alphaAt과 같은 서서히) + dim(바깥 어둡게·흐리게 0~1) + glow(가장자리 빛 0~1)
   */
  setFocus(items: { shape: Shape; show?: number[]; dim: number; glow: number }[]) {
    const gl = this.gl;
    for (const f of this.focus) this.dropMesh(f.mesh);
    this.focus = items.map((it) => {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(it.shape.rings.flat().flat()), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(this.map.p, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(it.shape.tris), gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return {
        mesh: { vao, bufs: [vb, ib], count: it.shape.tris.length },
        show: it.show ?? [0, 1],
        dim: it.dim,
        glow: it.glow,
      };
    });
  }
  /** 지역 강조용 그림판: [가림막 둘(1/2 크기), 흐린 그림 둘(1/4 크기)] + 결과(원래 크기) */
  private ensureFx(w: number, h: number) {
    const gl = this.gl;
    if (this.fx && this.fx.w === w && this.fx.h === h) return this.fx;
    if (this.fx) {
      for (const t of [...this.fx.tex, this.fx.out]) gl.deleteTexture(t);
      for (const f of [...this.fx.fbo, this.fx.outFbo]) gl.deleteFramebuffer(f);
    }
    const make = (tw: number, th: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, tw, th);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return [t, f] as const;
    };
    const hw = Math.max(1, w >> 1);
    const hh = Math.max(1, h >> 1);
    const qw = Math.max(1, w >> 2);
    const qh = Math.max(1, h >> 2);
    const parts = [make(hw, hh), make(hw, hh), make(qw, qh), make(qw, qh)];
    const [out, outFbo] = make(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fx = { w, h, tex: parts.map((p) => p[0]), fbo: parts.map((p) => p[1]), out, outFbo };
    return this.fx;
  }
  /**
   * 지역 강조 한 번: 강조할 곳을 1/2 크기 가림막에 그려(보이는 정도 = 밝기, 여럿이면 큰 쪽) 흐리게 퍼뜨리고, 그림도 1/4 크기로
   * 흐리게 해서 FOCUS_FS로 합친다. 결과 텍스처를 돌려준다(없으면 null - 강조할 것이 안 보이는 시각)
   */
  private drawFocus(
    view: GlView,
    offs: number[],
    src: WebGLTexture,
    W: number,
    H: number,
  ): WebGLTexture | null {
    const gl = this.gl;
    const live = this.focus
      .map((f) => ({ f, a: alphaAt({ show: f.show }, this.time) }))
      .filter((x) => x.a > 0);
    if (!live.length) return null;
    const fx = this.ensureFx(W, H);
    const hw = Math.max(1, W >> 1);
    const hh = Math.max(1, H >> 1);
    const qw = Math.max(1, W >> 2);
    const qh = Math.max(1, H >> 2);
    // 가림막
    gl.bindFramebuffer(gl.FRAMEBUFFER, fx.fbo[0]);
    gl.viewport(0, 0, hw, hh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.useProgram(this.map.p);
    setFrameUniforms(gl, this.map.u, view);
    let peak = 0;
    let dim = 0;
    let glow = 0;
    for (const { f, a } of live) {
      peak = Math.max(peak, a);
      dim = Math.max(dim, f.dim * a);
      glow = Math.max(glow, f.glow * a);
      gl.uniform4f(this.map.u("u_color"), a, a, a, 1);
      gl.bindVertexArray(f.mesh.vao);
      for (const off of offs) {
        gl.uniform1f(this.map.u("u_off"), off);
        gl.drawElements(gl.TRIANGLES, f.mesh.count, gl.UNSIGNED_INT, 0);
      }
    }
    gl.blendEquation(gl.FUNC_ADD);
    gl.disable(gl.BLEND);
    // 흐리게(가림막: 반지름 화면 높이의 약 2.5%, 그림: 약 1%) - 가로·세로 두 번씩
    const blur = (from: WebGLTexture, via: number, to: number, w: number, h: number, px: number) => {
      gl.useProgram(this.blurP.p);
      gl.uniform1i(this.blurP.u("u_img"), 0);
      gl.bindVertexArray(this.quadVao);
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0);
      for (let k = 0; k < 2; k++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fx.fbo[via]);
        gl.bindTexture(gl.TEXTURE_2D, k ? fx.tex[to] : from);
        gl.uniform2f(this.blurP.u("u_step"), px / w, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fx.fbo[to]);
        gl.bindTexture(gl.TEXTURE_2D, fx.tex[via]);
        gl.uniform2f(this.blurP.u("u_step"), 0, px / h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
    if ((globalThis as { __sceneDebug?: string }).__sceneDebug === "focus0") return fx.tex[0];
    // 가림막 0 → (1 거쳐) 0
    blur(fx.tex[0], 1, 0, hw, hh, (hh * 0.025) / 4);
    // 그림 → 2 → (3 거쳐) 2
    gl.bindFramebuffer(gl.FRAMEBUFFER, fx.fbo[2]);
    gl.viewport(0, 0, qw, qh);
    gl.useProgram(this.copy.p);
    gl.uniform1i(this.copy.u("u_img"), 0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    blur(fx.tex[2], 3, 2, qw, qh, (qh * 0.01) / 4);
    // 합치기
    gl.bindFramebuffer(gl.FRAMEBUFFER, fx.outFbo);
    gl.viewport(0, 0, W, H);
    const p = this.focusP;
    gl.useProgram(p.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fx.tex[2]);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fx.tex[0]);
    gl.uniform1i(p.u("u_img"), 0);
    gl.uniform1i(p.u("u_blur"), 1);
    gl.uniform1i(p.u("u_mask"), 2);
    gl.uniform1f(p.u("u_peak"), peak);
    gl.uniform1f(p.u("u_dim"), dim / Math.max(peak, 1e-6));
    gl.uniform1f(p.u("u_glow"), glow / Math.max(peak, 1e-6));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.activeTexture(gl.TEXTURE0);
    // 개발 확인: __sceneDebug = "focus"면 흐린 가림막을 그대로
    if ((globalThis as { __sceneDebug?: string }).__sceneDebug === "focus") return fx.tex[0];
    return fx.out;
  }
  /** 영역 번지기 항목(도형은 삼각형으로, 거리 격자는 R16F 텍스처로 올린다) */
  setSpread(items: SpreadItem[]) {
    const gl = this.gl;
    for (const m of this.spreadMesh.values()) this.dropMesh(m);
    for (const t of this.spreadTex.values()) gl.deleteTexture(t);
    this.spreadMesh.clear();
    this.spreadTex.clear();
    this.spread = items;
    const tris = (s: Shape) => {
      if (this.spreadMesh.has(s)) return;
      const pos = new Float32Array(s.rings.flat().flat());
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(this.spreadP.p, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(s.tris), gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      this.spreadMesh.set(s, { vao, bufs: [vb, ib], count: s.tris.length });
    };
    for (const it of items) {
      tris(it.last);
      for (const seg of it.segments) {
        if (seg.from) tris(seg.from);
        tris(seg.to);
        const f = seg.field;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, f.w, f.h, 0, gl.RED, gl.HALF_FLOAT, f.data);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.spreadTex.set(f, tex);
      }
    }
  }
  /** 나라: 삼각형 도형과 [r,g,b,진하기] */
  setPolities(list: { shape: Shape; color: number[] }[], border: number[]) {
    this.dropMesh(this.polities);
    this.dropMesh(this.borders);
    const { fill, lines } = this.polityMeshes(list, border);
    this.polities = fill;
    this.borders = lines;
    this.dropMesh(this.grow);
    this.grow = this.makeLines(
      list.flatMap(({ shape, color }) =>
        shape.rings.map((line) => ({ line, width: 1, color: [color[0], color[1], color[2], 1], closed: true })),
      ),
    );
  }
  /** 타임랩스(장면 years flow)에서 녹아 넘어갈 다음 해 국경(없으면 null) */
  setNextPolities(list: { shape: Shape; color: number[] }[] | null, border: number[]) {
    if (this.next) {
      this.dropMesh(this.next.fill);
      this.dropMesh(this.next.lines);
      this.next = null;
    }
    if (list) this.next = this.polityMeshes(list, border);
  }
  /** 다음 해 국경을 섞는 정도(0~1) */
  setYearMix(m: number) {
    this.yearMix = m;
  }
  private polityMeshes(list: { shape: Shape; color: number[] }[], border: number[]) {
    const gl = this.gl;
    const pos: number[] = [];
    const idx: number[] = [];
    for (const { shape, color } of list) {
      const base = pos.length / 6;
      for (const r of shape.rings)
        for (const [x, y] of r) pos.push(x, y, color[0], color[1], color[2], color[3] ?? 1);
      for (const i of shape.tris) idx.push(base + i);
    }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(this.polity.p, "a_pos");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 24, 0);
    const c = gl.getAttribLocation(this.polity.p, "a_col");
    gl.enableVertexAttribArray(c);
    gl.vertexAttribPointer(c, 4, gl.FLOAT, false, 24, 8);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const w = this.look?.border.width ?? 0.6;
    return {
      fill: { vao, bufs: [vb, ib], count: idx.length } as Mesh,
      lines: this.makeLines(
        list.flatMap(({ shape }) =>
          shape.rings.map((line) => ({ line, width: w, color: border, closed: true })),
        ),
      ),
    };
  }
  setTerrain(t: SceneTerrain | null) {
    const gl = this.gl;
    if (this.terrain) {
      this.dropMesh(this.terrain.land);
      this.dropMesh(this.terrain.lakes);
      gl.deleteTexture(this.terrain.tc);
      gl.deleteTexture(this.terrain.ts);
      if (this.terrain.th) gl.deleteTexture(this.terrain.th);
      for (const m of this.terrain.lines) this.dropMesh(m);
      this.terrain = null;
    }
    if (t) {
      const tex = (img: TexImageSource, gray: boolean) => {
        const tx = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gray ? gl.R8 : gl.RGBA8,
          gray ? gl.RED : gl.RGBA,
          gl.UNSIGNED_BYTE,
          img,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // 눕힌 땅은 비스듬히 보여 이방성 거르기로(먼 쪽이 뭉개지지 않게)
        if (this.anisoExt)
          gl.texParameterf(gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, this.aniso);
        return tx;
      };
      const dbg = (where: string) => {
        if (!(globalThis as { __sceneDebug?: string }).__sceneDebug) return;
        const e = gl.getError();
        if (e) console.error(`장면 GL 오류 ${e} @ ${where}`);
      };
      dbg("지형 전");
      const tc = tex(t.color, false);
      dbg("땅 색 그림");
      const ts = tex(t.shade, true);
      dbg("음영 그림");
      let th: WebGLTexture | null = null;
      if (t.height) {
        th = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, th);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
        t.height.levels.forEach((lv, i) =>
          gl.texImage2D(gl.TEXTURE_2D, i, gl.R16F, lv.w, lv.h, 0, gl.RED, gl.HALF_FLOAT, lv.data),
        );
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, t.height.levels.length - 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        dbg("고도 그림");
      }
      const h0 = t.height?.levels[0];
      this.terrain = {
        th,
        hSize: h0 ? [h0.w, h0.h] : [1, 1],
        texDeg: t.texDeg,
        box: t.box,
        land: this.makeFan(t.land),
        lakes: this.makeFan(t.lakes),
        tc,
        ts,
        lines: [],
      };
      // 강: 색·굵기가 강마다 달라 한 겹(MAX로 겹침 없이)
      this.terrain.lines.push(this.makeLines(t.rivers));
      this.terrainRings = { land: t.land, lakes: t.lakes };
    } else this.terrainRings = null;
    this.rebuildCoast();
  }
  private terrainRings: { land: Ring[]; lakes: Ring[] } | null = null;
  /** 해안 띠·해안선(지형이 있으면 10m, 없으면 50m)·호수 둘레 - 겹마다 한 묶음 */
  private rebuildCoast() {
    for (const m of this.coastLines) this.dropMesh(m);
    this.coastLines = [];
    this.dropMesh(this.coastMask);
    this.coastMask = null;
    const look = this.look;
    if (!look) return;
    const rings = this.terrainRings?.land ?? this.coast50;
    this.coastMask = this.makeLines(
      rings.map((line) => ({ line, width: 1, color: [1, 1, 1, 1], closed: true })),
    );
    for (const c of look.coast)
      this.coastLines.push(
        this.makeLines(rings.map((line) => ({ line, width: c.width, color: c.color, closed: true }))),
      );
    if (this.terrainRings && look.coast.length)
      this.coastLines.push(
        this.makeLines(
          this.terrainRings.lakes.map((line) => ({
            line,
            width: 1,
            color: [0.239, 0.29, 0.322, 0.5],
            closed: true,
          })),
        ),
      );
  }

  private ensureTargets(w: number, h: number) {
    const gl = this.gl;
    if (this.fb && this.fb.w === w && this.fb.h === h) return this.fb;
    if (this.fb) {
      gl.deleteFramebuffer(this.fb.msaa);
      gl.deleteRenderbuffer(this.fb.color);
      gl.deleteRenderbuffer(this.fb.depth);
      gl.deleteFramebuffer(this.fb.resolve);
      gl.deleteTexture(this.fb.tex);
      gl.deleteFramebuffer(this.fb.layer);
      gl.deleteTexture(this.fb.layerTex);
    }
    const color = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, color);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, w, h);
    const depth = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH24_STENCIL8, w, h);
    const msaa = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, msaa);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depth);
    const texOf = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const tex = texOf();
    const resolve = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, resolve);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const layerTex = texOf();
    const layer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layerTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fb = { w, h, msaa, color, depth, resolve, tex, layer, layerTex };
    return this.fb;
  }

  /** 영역 번지기 한 번(지금 시각): 다음 영역(문턱까지) → 앞 영역(남은 곳, 잃은 땅은 끝 무렵 서서히) */
  private drawSpread(view: GlView, offs: number[], look: SceneLook) {
    const gl = this.gl;
    const p = this.spreadP;
    gl.useProgram(p.p);
    setFrameUniforms(gl, p.u, view);
    gl.uniform1i(p.u("u_mul"), look.multiply ? 1 : 0);
    gl.uniform3fv(p.u("u_ink"), INK_RGB);
    gl.uniform1i(p.u("u_dist"), 0);
    // 덮는 느낌이 나게 보통 나라 색보다 진하게(첫 구간 처음에는 보통 진하기에서 - 장면 국경에서 넘겨받을 때 튀지 않게)
    const strong = (boost: number) => Math.min(0.6, look.regionOpacity * (1 + 0.5 * boost));
    const fill = (mesh: Mesh | undefined, r: number, a: number) => {
      if (!mesh || a <= 0) return;
      gl.uniform1f(p.u("u_r"), r);
      gl.uniform1f(p.u("u_alpha"), a);
      gl.bindVertexArray(mesh.vao);
      for (const off of offs) {
        gl.uniform1f(p.u("u_off"), off);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
      }
    };
    for (const it of this.spread) {
      const now = spreadAt(it, this.time);
      if (!now) continue;
      gl.uniform4fv(p.u("u_col"), it.color);
      gl.uniform1f(p.u("u_rough"), it.rough);
      if (now.kind === "full") {
        fill(this.spreadMesh.get(now.shape), -1, strong(1));
        continue;
      }
      const f = now.seg.field;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.spreadTex.get(f)!);
      gl.uniform4fv(p.u("u_box"), f.box);
      const alpha = strong(now.boost);
      fill(this.spreadMesh.get(now.seg.to), now.r, alpha);
      if (now.seg.from) fill(this.spreadMesh.get(now.seg.from), -1, alpha * now.fade);
    }
    gl.bindVertexArray(null);
  }

  /** 한 장 그린다(t·frames는 입자 씨앗). 캔버스 크기는 지도 칸 × 기기 배율 */
  draw(view: GlView, frame: number) {
    const look = this.look;
    if (!look) return;
    const gl = this.gl;
    const dpr = devicePixelRatio || 1;
    const W = Math.round(view.frame.w * dpr);
    const H = Math.round(view.frame.h * dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    const fb = this.ensureTargets(W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb.msaa);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1);
    gl.clearStencil(0);
    // 지우기도 쓰기 마스크를 따른다 - 전 프레임 끝의 stencilMask(0)가 남아 있으면 스텐실이 안 지워져 짝홀 비트가 프레임마다
    // 뒤집혔다(같은 t인데 땅·바다가 번갈아 나옴)
    gl.stencilMask(0xff);
    gl.colorMask(true, true, true, true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    // 하늘(지도 칸 바탕과 같은 위 하늘 → 아래 바다 색)
    gl.useProgram(this.sky.p);
    gl.uniform4fv(this.sky.u("u_top"), look.sky);
    gl.uniform4fv(this.sky.u("u_bottom"), look.ocean);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 보이는 범위(판 전체)를 덮는 네모 - 바다·덮기용(세로는 지도 위아래 끝까지)
    const { v } = view;
    const mh = 1000 * 1.5; // 지도 세로보다 넉넉히(위·아래 끝은 지도 칸 하늘이 아니라 바다로)
    const rectOf = (x0: number, y0: number, x1: number, y1: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.rect.buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([x0, y0, x1, y0, x0, y1, x1, y1]),
        gl.DYNAMIC_DRAW,
      );
      gl.bindVertexArray(this.rect.vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const pad = v.w;
    const cover = () => rectOf(v.x - pad, Math.max(-mh, v.y - v.h), v.x + v.w + pad, Math.min(mh, v.y + 2 * v.h));
    const bindMap = (p: Prog, off: number) => {
      gl.useProgram(p.p);
      setFrameUniforms(gl, p.u, view);
      gl.uniform1f(p.u("u_off"), off);
    };
    const flat = (c: number[], off = 0) => {
      bindMap(this.flat, off);
      const a = c[3] ?? 1;
      gl.uniform4f(this.flat.u("u_color"), c[0] * a, c[1] * a, c[2] * a, a);
    };

    const dbg = (globalThis as { __sceneDebug?: string }).__sceneDebug;
    const check = (where: string) => {
      if (!dbg) return;
      const e = gl.getError();
      if (e) console.error(`장면 GL 오류 ${e} @ ${where}`);
    };
    check("시작");
    // 바다(폭풍이면 너울·흰 물마루 - 시간은 프레임 번호로)
    if (this.storm.strength > 0) {
      bindMap(this.oceanP, 0);
      gl.uniform4fv(this.oceanP.u("u_color"), look.ocean);
      gl.uniform1f(this.oceanP.u("u_storm"), this.storm.strength);
      gl.uniform1f(this.oceanP.u("u_time"), frame / 30);
    } else flat(look.ocean);
    cover();
    check("바다");

    // 복사본(경도 한 바퀴씩): 보이는 범위에 걸치는 것만
    const offs: number[] = [];
    for (let k = -2; k <= 2; k++) {
      const o = view.shift + k * 1000;
      if (o < v.x + v.w + pad && o + 1000 > v.x - pad) offs.push(o);
    }
    const t = this.terrain;
    // 지형 상자는 화면 가운데에 가장 가까운 복사본 하나
    const tOff = t
      ? offs.reduce((best, o) => {
          const c = v.x + v.w / 2;
          const d = (o2: number) => Math.abs((t.box[0] + t.box[2]) / 2 + o2 - c);
          return d(o) < d(best) ? o : best;
        }, offs[0] ?? view.shift)
      : 0;

    // ── 스텐실: 지형 상자·50m 땅·10m 땅·호수 ──
    gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false);
    const invert = (mesh: Mesh, bit: number, off: number) => {
      bindMap(this.map, off);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilMask(bit);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
    };
    if (this.land50) for (const off of offs) invert(this.land50, S_LAND50, off);
    check("50m 땅");
    if (t) {
      bindMap(this.map, tOff);
      gl.stencilFunc(gl.ALWAYS, 0xff, 0xff);
      gl.stencilMask(S_BOX);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      rectOf(t.box[0], t.box[1], t.box[2], t.box[3]);
      invert(t.land, S_LAND10, tOff);
      invert(t.lakes, S_LAKE, tOff);
      check("지형 스텐실");
    }
    // 그린 땅 = 상자 밖 50m 땅 + 상자 안 10m 땅(호수 빼고) → S_LAND
    const markLand = (ref: number, mask: number) => {
      gl.stencilFunc(gl.EQUAL, ref, mask);
      gl.stencilMask(S_LAND);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      bindMap(this.map, 0);
      cover();
    };
    markLand(S_LAND | S_LAND50, S_BOX | S_LAND50);
    if (t) markLand(S_LAND | S_BOX | S_LAND10, S_BOX | S_LAND10 | S_LAKE);
    gl.colorMask(true, true, true, true);
    gl.stencilMask(0);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

    // (개발 확인) 스텐실 비트를 색으로: window.__sceneDebug = "stencil"
    if (dbg?.startsWith("bit:")) {
      const bit = Number(dbg.slice(4));
      gl.stencilFunc(gl.EQUAL, bit, bit);
      flat([1, 1, 1, 1]);
      cover();
    }
    if (dbg === "stencil") {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const bits: [number, number[]][] = [
        [S_LAND10, [0.5, 0, 0, 1]],
        [S_LAKE, [0, 0, 0.5, 1]],
        [S_BOX, [0, 0.25, 0, 1]],
        [S_LAND50, [0.25, 0.25, 0, 1]],
        [S_LAND, [0, 0.25, 0.25, 1]],
      ];
      for (const [bit, c] of bits) {
        gl.stencilFunc(gl.EQUAL, bit, bit);
        flat(c);
        cover();
      }
      gl.disable(gl.BLEND);
      gl.disable(gl.STENCIL_TEST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb.msaa);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb.resolve);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(this.copy.p);
      gl.bindTexture(gl.TEXTURE_2D, fb.tex);
      gl.uniform1i(this.copy.u("u_img"), 0);
      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }
    // 상자 밖 땅(50m)
    gl.stencilFunc(gl.EQUAL, S_LAND50, S_BOX | S_LAND50);
    flat(this.winterLand(look.land));
    cover();
    // 상자 안 지형
    if (t) {
      gl.stencilFunc(gl.EQUAL, S_BOX | S_LAND10, S_BOX | S_LAND10 | S_LAKE);
      const p = this.terrainP;
      bindMap(p, tOff);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t.tc);
      gl.uniform1i(p.u("u_tc"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, t.ts);
      gl.uniform1i(p.u("u_ts"), 1);
      gl.uniform4f(p.u("u_box"), ...t.box);
      gl.uniform1f(p.u("u_relief"), look.relief);
      gl.uniform1i(p.u("u_mode"), look.ground === "palette" ? 1 : look.ground === "css" ? 0 : 2);
      gl.uniform3fv(p.u("u_pal"), look.palette.slice(0, 7).flatMap((c) => c.slice(0, 3)));
      gl.uniform1f(p.u("u_greenness"), look.greenness);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, t.th);
      gl.uniform1i(p.u("u_th"), 2);
      gl.uniform1i(p.u("u_hasH"), t.th ? 1 : 0);
      gl.uniform2f(p.u("u_hSize"), t.hSize[0], t.hSize[1]);
      gl.uniform2f(p.u("u_texDeg"), t.texDeg[0], t.texDeg[1]);
      gl.uniform1f(p.u("u_snowline"), look.snowline);
      gl.uniform1f(p.u("u_zoom"), view.zoom);
      gl.uniform1f(p.u("u_cover"), this.winter.cover);
      rectOf(t.box[0], t.box[1], t.box[2], t.box[3]);
      // 상자 안 물(얕은 바다)
      if (t.th) {
        gl.stencilFunc(gl.EQUAL, S_BOX, S_BOX | S_LAND);
        const w = this.waterP;
        bindMap(w, tOff);
        gl.uniform1i(w.u("u_th"), 2);
        gl.uniform4f(w.u("u_box"), ...t.box);
        gl.uniform4fv(w.u("u_color"), look.ocean);
        gl.uniform1f(w.u("u_storm"), this.storm.strength);
        gl.uniform1f(w.u("u_time"), frame / 30);
        rectOf(t.box[0], t.box[1], t.box[2], t.box[3]);
      }
      gl.activeTexture(gl.TEXTURE0);
      // 얼어붙은 호수(장면 winter.frozen)
      if (this.winter.frozen) {
        gl.stencilFunc(gl.EQUAL, S_BOX | S_LAKE, S_BOX | S_LAKE);
        flat([...ICE_RGB, 1], tOff);
        rectOf(t.box[0], t.box[1], t.box[2], t.box[3]);
      }
    }

    // 나라 색·국경선(땅 안쪽만)
    gl.stencilFunc(gl.EQUAL, S_LAND, S_LAND);
    gl.enable(gl.BLEND);
    if (look.multiply) gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // 나라 색을 칠한 곳은 0x40으로 표시(해안 채우기가 그 밖만 칠하게)
    const S_POL = 0x40;
    const S_NEAR = 0x80;
    gl.stencilMask(S_POL);
    // 영역 번지기가 먼저 칠하고 0x40을 켠다 - 그 자리에는 다른 나라 색(덮인 나라)을 칠하지 않는다.
    // 비교에 0x40을 넣고(아직 안 칠한 곳만) INVERT로 켠다(REPLACE는 비교 값을 그대로 써서 0x40을 켤 수 없다)
    const spreadOn = look.polities && this.spread.length > 0;
    if (spreadOn) {
      gl.stencilFunc(gl.EQUAL, S_LAND, S_LAND | S_POL);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
      this.drawSpread(view, offs, look);
      // 이어서 나라 색도 칠하지 않은 곳만(번진 자리는 건너뜀)
    } else {
      gl.stencilFunc(gl.EQUAL, S_LAND | S_POL, S_LAND);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    }
    // 타임랩스: 지금 해(1 - mix)와 다음 해(mix)를 겹쳐 녹아 넘어간다(번지기가 있는 장면은 겹칠 수 없어 바로 바뀜)
    const mix = this.next && !spreadOn ? this.yearMix : 0;
    const fills: [Mesh | null, number][] = [
      [this.polities, 1 - mix],
      [mix > 0 ? this.next!.fill : null, mix],
    ];
    if (look.polities)
      for (const [mesh, k] of fills) {
        if (!mesh || !mesh.count || k <= 0) continue;
        for (const off of offs) {
          gl.useProgram(this.polity.p);
          setFrameUniforms(gl, this.polity.u, view);
          gl.uniform1f(this.polity.u("u_off"), off);
          gl.uniform1i(this.polity.u("u_mul"), look.multiply ? 1 : 0);
          gl.uniform1f(this.polity.u("u_alpha"), look.regionOpacity * k);
          gl.bindVertexArray(mesh.vao);
          gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
        }
      }
    gl.stencilMask(0);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    // 해안 채우기: 해안선에서 coastFill km 안(0x80)이고 나라가 없는 땅을, 나라 테두리를 굵게 그어 그 나라 색으로 - 픽셀마다 한 번만
    const coastPx =
      look.coastFill > 0
        ? (look.coastFill / (40.075 * Math.cos(latOfY(v.y + v.h / 2)))) * (view.size.h / view.v.h)
        : 0;
    if (look.polities && coastPx > 0.5 && this.grow && this.coastMask) {
      const lineOffs = t ? [tOff] : offs;
      gl.colorMask(false, false, false, false);
      gl.stencilMask(S_NEAR);
      gl.stencilFunc(gl.ALWAYS, S_NEAR, S_NEAR);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      gl.disable(gl.BLEND);
      for (const off of lineOffs) this.drawLines(view, this.coastMask, off, false, { width: coastPx * 2 });
      gl.colorMask(true, true, true, true);
      gl.enable(gl.BLEND);
      // 땅·해안 가까움·나라 없음(S_POL 0)인 곳만, 칠하면서 S_POL을 켠다(INVERT: 0 → 1) - 다음 테두리는 같은 픽셀을 다시 칠하지 않는다
      gl.stencilMask(S_POL);
      gl.stencilFunc(gl.EQUAL, S_LAND | S_NEAR, S_LAND | S_NEAR | S_POL);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
      for (const off of offs)
        this.drawLines(view, this.grow, off, look.multiply, {
          width: coastPx * 2,
          alpha: look.regionOpacity,
        });
      gl.stencilMask(0);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    }
    if (look.polities && this.borders && this.borders.count && mix < 1)
      for (const off of offs) this.drawLines(view, this.borders, off, look.multiply, { alpha: 1 - mix });
    if (look.polities && mix > 0 && this.next!.lines.count)
      for (const off of offs) this.drawLines(view, this.next!.lines, off, look.multiply, { alpha: mix });
    gl.disable(gl.STENCIL_TEST);

    // 반투명 선 겹(해안 띠·해안선·호수 둘레·강): 따로 한 장에 MAX로 그려 얹는다
    const layered = (
      mesh: Mesh,
      list: number[],
      style: { dash?: [number, number]; wobble?: number; tint?: number[] } = {},
    ) => {
      if (!mesh.count) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.layer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.MAX);
      for (const off of list) this.drawLines(view, mesh, off, false, style);
      gl.blendEquation(gl.FUNC_ADD);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.msaa);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.copy.p);
      gl.bindTexture(gl.TEXTURE_2D, fb.layerTex);
      gl.uniform1i(this.copy.u("u_img"), 0);
      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const coastOffs = t ? [tOff] : offs;
    for (const m of this.coastLines) layered(m, coastOffs);
    // 강(얼었으면 얼음 색)
    const riverStyle = this.winter.frozen ? { tint: [...ICE_RGB, 0.85] } : {};
    if (t) for (const m of t.lines) layered(m, [tOff], riverStyle);

    // 판 층: 칠한 곳(짝홀 스텐실 0x20 → 덮으며 지움)·선(먹선 흔들림 1.25px - 예전 svg 필터 폭). 선 묶음은 한 겹씩 MAX로
    // (반투명 선분 캡슐이 마디마다 겹쳐 점선처럼 보였다)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const S_FILL = 0x20;
    for (const op of this.plane) {
      if (op.kind === "lines") {
        layered(op.mesh, offs, { dash: op.dash, wobble: op.wobble ? 1.25 : 0 });
        continue;
      }
      for (const off of offs) {
        if (op.kind === "fill") {
          gl.enable(gl.STENCIL_TEST);
          gl.disable(gl.BLEND);
          gl.colorMask(false, false, false, false);
          gl.stencilFunc(gl.ALWAYS, 0, 0xff);
          gl.stencilMask(S_FILL);
          gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
          bindMap(this.map, off);
          gl.bindVertexArray(op.mesh.vao);
          gl.drawElements(gl.TRIANGLES, op.mesh.count, gl.UNSIGNED_INT, 0);
          gl.colorMask(true, true, true, true);
          gl.enable(gl.BLEND);
          gl.stencilFunc(gl.EQUAL, S_FILL, S_FILL);
          gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
          flat(op.color, off);
          rectOf(...op.box);
          gl.stencilMask(0);
          gl.disable(gl.STENCIL_TEST);
        }
      }
    }
    // 화면 층(대군·부대·깃발·화살표·먼지·안개)
    if (this.hasOverlay && this.overlay) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.copy.p);
      gl.bindTexture(gl.TEXTURE_2D, this.overlay);
      gl.uniform1i(this.copy.u("u_img"), 0);
      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disable(gl.BLEND);

    // 풀기 → 마감(화면)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb.msaa);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb.resolve);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    // 지역 강조(있으면 그 결과를 마감으로)
    const focused = this.focus.length ? this.drawFocus(view, offs, fb.tex, W, H) : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    const g = look.grade;
    const p = this.grade;
    gl.useProgram(p.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, focused ?? fb.tex);
    gl.uniform1i(p.u("u_img"), 0);
    gl.uniform1i(p.u("u_on"), g ? 1 : 0);
    if (g) {
      gl.uniform1f(p.u("u_exposure"), g.exposure);
      gl.uniform1f(p.u("u_curve"), g.curve);
      gl.uniform3fv(p.u("u_lift"), g.lift);
      gl.uniform3fv(p.u("u_white"), g.white);
      gl.uniform1f(p.u("u_contrast"), g.contrast);
      gl.uniform1f(p.u("u_sat"), g.saturation);
      gl.uniform1f(p.u("u_vig"), g.vignette);
      gl.uniform1f(p.u("u_grain"), g.grain);
      gl.uniform1ui(p.u("u_seed"), (frame + 1234) >>> 0);
      gl.uniform2f(p.u("u_size"), W, H);
    }
    // 내리는 눈(마감과 같은 셰이더 - 마감을 꺼도 눈은 내린다)
    gl.uniform2f(p.u("u_size"), W, H);
    gl.uniform1f(p.u("u_fall"), this.winter.fall);
    gl.uniform1f(p.u("u_time"), frame / 30);
    gl.uniform1f(p.u("u_wind"), this.winter.wind);
    gl.uniform1f(p.u("u_storm"), this.storm.strength);
    gl.uniform1i(p.u("u_lightning"), this.storm.lightning ? 1 : 0);
    gl.uniform1f(p.u("u_swind"), this.storm.wind);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  private drawLines(
    view: GlView,
    mesh: Mesh,
    off: number,
    mul: boolean,
    style: {
      dash?: [number, number];
      wobble?: number;
      width?: number;
      alpha?: number;
      tint?: number[];
    } = {},
  ) {
    const gl = this.gl;
    gl.useProgram(this.line.p);
    setFrameUniforms(gl, this.line.u, view);
    gl.uniform1f(this.line.u("u_off"), off);
    gl.uniform1i(this.line.u("u_mul"), mul ? 1 : 0);
    gl.uniform2f(this.line.u("u_dash"), style.dash?.[0] ?? 0, style.dash?.[1] ?? 0);
    gl.uniform1f(this.line.u("u_pxPerUnit"), view.size.h / view.v.h);
    gl.uniform1f(this.line.u("u_wobble"), style.wobble ?? 0);
    gl.uniform1f(this.line.u("u_wOverride"), style.width ?? 0);
    gl.uniform1f(this.line.u("u_alpha"), style.alpha ?? 1);
    gl.uniform4fv(this.line.u("u_tint"), style.tint ?? [0, 0, 0, 0]);
    gl.bindVertexArray(mesh.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, mesh.count);
  }
}
