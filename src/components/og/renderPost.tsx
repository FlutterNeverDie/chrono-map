import { ImageResponse } from "next/og";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import world from "world-atlas/land-50m.json";
import { fontsFor, missingChars } from "./fonts";

/**
 * SNS 글 이미지 한 장(1080×1350, 4:5 세로 - 피드에서 크게 보인다). 도메인을 모른다.
 * 그 해 국경 지도를 화면 가득 깔고, 위에 큰 한 줄(head)·작은 한 줄(sub), 아래에 제목·사이트 이름·국경 출처.
 */
export type PostCard = {
  /** 맨 위 작은 글자(때) */
  kicker: string;
  head: string;
  sub: string;
  title: string;
  brand: string;
  /** 국경 출처(CC BY 4.0 표기) */
  credit: string;
  /** 사건 위치 [경도, 위도] */
  pin: [number, number];
  /** 가로로 보이는 경도 범위(도, 기본 40) - 세계적인 사건은 넓게 */
  span?: number;
  /** 그 해 나라들: 도형·색·이름(이름표 후보는 넓은 순으로 앞에서 고른다) */
  regions: {
    shape: Feature<Polygon | MultiPolygon>;
    color: string;
    label?: { text: string; at: [number, number]; area: number };
  }[];
};

export const POST_SIZE = { width: 1080, height: 1350 };
const { width: W, height: H } = POST_SIZE;
const PAD = 72;

const C = {
  ink: "#2b2418",
  muted: "#6f6450",
  accent: "#c2410c",
  ocean: "#cfe6f2",
  land: "#f4ecd6",
  border: "#6b5a3e",
  dark: "31,26,18",
  paper: "250,246,236",
};

const topo = world as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topo, topo.objects.land);

export function renderPost(card: PostCard): ImageResponse {
  const { fonts, family } = fontsFor("en");
  const missing = missingChars(
    "en",
    [card.kicker, card.head, card.sub, card.title].join(""),
  );
  if (missing.length)
    console.warn(
      `[og] 글꼴에 없는 글자 ${missing.join("")} (${card.title}) → npm run og:fonts`,
    );

  // 사건 위치를 가로 가운데, 세로 58% 지점에
  const projection = geoMercator()
    .rotate([-card.pin[0], 0])
    .scale(W / (((card.span ?? 40) * Math.PI) / 180))
    .translate([W / 2, H / 2]);
  const [, py] = projection(card.pin)!;
  projection.translate([W / 2, H / 2 + H * 0.58 - py]);
  // 화면 밖은 잘라서 경로를 작게
  projection.clipExtent([
    [-20, -20],
    [W + 20, H + 20],
  ]);
  const path = geoPath(projection).digits(1);
  const [px, pyy] = projection(card.pin)!;

  // 이름표: 위 글자 상자와 아래 제목 사이에 들어오는 넓은 나라 최대 6개, 겹치면 뺀다
  const labels: { text: string; x: number; y: number }[] = [];
  for (const r of [...card.regions]
    .filter((r) => r.label)
    .sort((a, b) => b.label!.area - a.label!.area)) {
    const p = projection(r.label!.at);
    if (!p || p[0] < 90 || p[0] > W - 90 || p[1] < 540 || p[1] > H - 280)
      continue;
    if (
      labels.some(
        (l) => Math.abs(l.x - p[0]) < 220 && Math.abs(l.y - p[1]) < 50,
      )
    )
      continue;
    labels.push({ text: r.label!.text, x: p[0], y: p[1] });
    if (labels.length >= 6) break;
  }

  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        position: "relative",
        fontFamily: family,
        background: C.ocean,
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path d={path(land) ?? ""} fill={C.land} />
        {card.regions.map((r, i) => {
          const d = path(r.shape);
          return d ? (
            <path
              key={i}
              d={d}
              fill={r.color}
              fillOpacity={0.55}
              stroke={C.border}
              strokeOpacity={0.6}
              strokeWidth={1.2}
            />
          ) : null;
        })}
        <circle cx={px} cy={pyy} r={46} fill={C.accent} fillOpacity={0.18} />
        <circle
          cx={px}
          cy={pyy}
          r={28}
          fill="none"
          stroke={C.accent}
          strokeWidth={4}
          strokeOpacity={0.6}
        />
        <circle
          cx={px}
          cy={pyy}
          r={14}
          fill={C.accent}
          stroke="#faf6ec"
          strokeWidth={5}
        />
      </svg>
      {/* 나라 이름(svg 안 글자는 satori가 글꼴을 못 넣어 div로) */}
      {labels.map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: l.y - 20,
            left: l.x - 200,
            width: 400,
            display: "flex",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 700,
            color: "rgba(59,50,34,0.75)",
          }}
        >
          {l.text}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          display: "flex",
          flexDirection: "column",
          padding: `72px ${PAD}px 150px`,
          backgroundImage: `linear-gradient(rgba(${C.dark},1) 0%, rgba(${C.dark},0.93) 62%, rgba(${C.dark},0) 100%)`,
          color: "#faf6ec",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#fdba74",
            textTransform: "uppercase",
          }}
        >
          {card.kicker}
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: card.head.length > 34 ? 76 : 84,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {card.head}
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 44,
            fontWeight: 500,
            lineHeight: 1.25,
            color: "#f1e8d4",
          }}
        >
          {card.sub}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: W,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: `120px ${PAD}px 56px`,
          backgroundImage: `linear-gradient(rgba(${C.paper},0), rgba(${C.paper},0.95) 45%, rgba(${C.paper},1))`,
          color: C.ink,
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}
        >
          <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.15 }}>
            {card.title}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 26,
              fontWeight: 700,
              color: C.accent,
            }}
          >
            {card.brand}
          </div>
        </div>
        <div style={{ fontSize: 18, color: C.muted }}>{card.credit}</div>
      </div>
    </div>,
    { ...POST_SIZE, fonts },
  );
}
