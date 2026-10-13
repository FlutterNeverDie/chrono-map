import { ImageResponse } from "next/og";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/land-110m.json";
import { OG_SIZE, cardText, type OgCard } from "./card";
import { fontsFor, missingChars } from "./fonts";

/** 일반(밝은) 테마 색 — globals.css의 :root 값과 맞춘다 */
const C = {
  paper: "#faf6ec",
  ink: "#2b2418",
  muted: "#6f6450",
  accent: "#c2410c",
  ocean: "#cfe6f2",
  land: "#f4ecd6",
  border: "#a8997a",
};

const { width: W, height: H } = OG_SIZE;
/** 왼쪽 글자 칸 너비·안쪽 여백·글자 폭 */
const PANEL_W = 600;
const PAD = 64;
/** 글자 칸 오른쪽의 흐려지는 띠 */
const FADE_W = 100;
const TEXT_W = PANEL_W - PAD * 2;
/** 지도에서 점들의 가운데가 놓일 가로 위치(글자 칸 오른쪽 가운데) */
const FOCUS_X = 920;

/** 제목 글자 크기: 한 줄에 들어가는 가장 큰 크기(44~72). 그래도 넘치면 두 줄(한중일 글자 1em, 그 밖 0.55em로 어림) */
function titleSize(title: string): number {
  const em = [...title].reduce(
    (w, ch) => w + (ch.codePointAt(0)! >= 0x2e80 ? 1 : 0.55),
    0,
  );
  const one = Math.floor(TEXT_W / em);
  return one >= 44 ? Math.min(72, one) : 52;
}

const topo = world as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topo, topo.objects.land);

/** 기본 배율: 지구 한 바퀴 = 이미지 폭 1.25배 */
const BASE_SCALE = (W * 1.25) / (2 * Math.PI);
/** 진한 점들이 들어가야 하는 지도 칸 너비(글자 칸 오른쪽) */
const MAP_W = 440;

/**
 * 진한 점들이 모두 보이게 잡는 화면: 점들의 경도를 덮는 가장 짧은 구간의 가운데를 FOCUS_X에 두고,
 * 구간이 지도 칸보다 넓으면 축소한다. 점이 세계 전체에 퍼져 있으면(첫 화면) 기본 배율로 둔다.
 */
function view(dots: OgCard["dots"]): {
  lon: number;
  lat: number;
  scale: number;
} {
  const strong = dots.filter((d) => d.strong);
  const pts = strong.length ? strong : dots;
  if (!pts.length) return { lon: 10, lat: 25, scale: BASE_SCALE };
  const lons = pts
    .map((d) => (((d.coords[0] % 360) + 540) % 360) - 180)
    .sort((x, y) => x - y);
  // 가장 큰 빈틈의 반대쪽이 점들을 덮는 가장 짧은 구간
  let gap = 360 - (lons.at(-1)! - lons[0]);
  let from = lons[0];
  for (let i = 1; i < lons.length; i++)
    if (lons[i] - lons[i - 1] > gap) {
      gap = lons[i] - lons[i - 1];
      from = lons[i];
    }
  const arc = 360 - gap;
  const lats = pts.map((d) => d.coords[1]);
  const lat = Math.max(
    -25,
    Math.min(50, (Math.min(...lats) + Math.max(...lats)) / 2),
  );
  if (arc > 250) return { lon: from + arc / 2, lat: 25, scale: BASE_SCALE };
  const fit = MAP_W / ((arc + 30) * (Math.PI / 180));
  return { lon: from + arc / 2, lat, scale: Math.min(BASE_SCALE, fit) };
}

/** 세계 지도(가로로 이어 붙여 화면을 채움) + 점 */
function WorldMap({ dots }: { dots: OgCard["dots"] }) {
  const v = view(dots);
  const projection = geoMercator()
    .rotate([-v.lon, 0])
    .scale(v.scale)
    .translate([FOCUS_X, H / 2]);
  // 가운데 위도를 이미지 세로 가운데로
  const [, cy] = projection([v.lon, v.lat])!;
  projection.translate([FOCUS_X, H - cy]);
  const d = geoPath(projection).digits(1)(land) ?? "";
  const span = 2 * Math.PI * v.scale;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill={C.ocean} />
      {[-2, -1, 0, 1, 2]
        .map((k) => k * span)
        .map((dx) => (
          <path
            key={dx}
            d={d}
            transform={`translate(${dx} 0)`}
            fill={C.land}
            stroke={C.border}
            strokeWidth={1}
          />
        ))}
      {[...dots]
        .sort((a, b) => Number(a.strong ?? false) - Number(b.strong ?? false))
        .map((dot, i) => {
          const [x, y] = projection(dot.coords) ?? [0, 0];
          return dot.strong ? (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={11}
              fill={C.accent}
              stroke={C.paper}
              strokeWidth={3}
            />
          ) : (
            <circle key={i} cx={x} cy={y} r={6} fill={C.muted} opacity={0.55} />
          );
        })}
    </svg>
  );
}

/** OG 이미지 한 장(1200×630 PNG). 왼쪽 글자, 오른쪽 지도 */
export function renderOg(card: OgCard): ImageResponse {
  const { fonts, family } = fontsFor(card.locale);
  const missing = missingChars(card.locale, cardText(card));
  if (missing.length)
    console.warn(
      `[og] 글꼴에 없는 글자 ${missing.join("")} (${card.title}) → npm run og:fonts`,
    );
  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        position: "relative",
        fontFamily: family,
        color: C.ink,
        background: C.paper,
      }}
    >
      {/* satori는 inset을 모른다 → top/left로 */}
      <div style={{ position: "absolute", top: 0, left: 0, display: "flex" }}>
        <WorldMap dots={card.dots} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: PANEL_W,
          width: FADE_W,
          height: H,
          display: "flex",
          backgroundImage: `linear-gradient(90deg, ${C.paper}, rgba(250,246,236,0))`,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: PANEL_W,
          height: H,
          padding: `60px ${PAD}px`,
          background: C.paper,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            color: C.accent,
          }}
        >
          {card.kicker}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: titleSize(card.title),
            fontWeight: 700,
            lineHeight: 1.15,
            // 두 줄이 될 때 한국어 낱말 가운데서 끊지 않게
            wordBreak: "keep-all",
          }}
        >
          {card.title}
        </div>
        {card.subtitle && (
          <div
            style={{
              marginTop: 14,
              fontSize: 32,
              fontWeight: 500,
              color: C.muted,
              lineHeight: 1.35,
            }}
          >
            {card.subtitle}
          </div>
        )}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {card.lines.slice(0, 3).map((line, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 16 }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  flexShrink: 0,
                  background: C.accent,
                }}
              />
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 500,
                  maxWidth: TEXT_W - 28,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {line}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
