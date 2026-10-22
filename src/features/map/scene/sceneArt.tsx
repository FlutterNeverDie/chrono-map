import type { ReactNode } from "react";
import { rng, type FlagKind, type UnitKind, type UnitState } from "./sceneData";
import { SHIP_COLORS, SHIPS, vesselOf } from "./sceneShip";
import { PLANE_COLORS, PLANE_FIXED, PLANES, aircraftOf } from "./sceneAir";

/**
 * 장면 부대 그림(영상 캐릭터 그림체에 맞춤 - RMW `public/chars/*`): 먹선 #2b1d14, 바랜 물감 색, 2단 그림자.
 * 오른쪽을 바라보고 땅이 y=0, 키 약 48(단위 = 기본 크기에서 화면 CSS px. 먹선 3 = 2560 폭 영상에서 6px).
 * 글자는 쓰지 않는다(진영은 색·깃발로).
 */
export const INK = "#2b1d14";
const SKIN = "#c69d77";
const HAT = "#7a2e22";
const GOLD = "#c29a46";
const HORSE = "#8b5e3c";
/** 쇠갑옷(루스 등) */
const ARMOR = "#7d8a96";
const HAIR = "#3a2516";
const STEEL = "#8c8a80";
const CANVAS = "#d9c9a3";
const W = 3;

const ink = {
  stroke: INK,
  strokeWidth: W,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

/** 2단 그림자(진한 작은 것 + 옅은 큰 것) */
export function Shadow({ w }: { w: number }) {
  return (
    <>
      <ellipse
        cx={2}
        cy={1}
        rx={w * 0.75}
        ry={w * 0.16}
        fill={INK}
        opacity={0.14}
      />
      <ellipse
        cx={1}
        cy={0.5}
        rx={w * 0.5}
        ry={w * 0.1}
        fill={INK}
        opacity={0.28}
      />
    </>
  );
}

/** 다리 하나: 엉덩이(x, y)에서 땅까지, swing(라디안)만큼 앞뒤로 */
function Leg({
  x,
  y,
  swing,
  w = 4,
}: {
  x: number;
  y: number;
  swing: number;
  w?: number;
}) {
  const kx = x + Math.sin(swing) * 5;
  const ky = y + (0 - y) * 0.5;
  const fx = x + Math.sin(swing) * 11 - Math.max(0, Math.sin(swing)) * 3;
  const fy = -Math.max(0, Math.cos(swing + 0.6) - 0.6) * 4;
  return (
    <polyline
      points={`${x},${y} ${kx},${ky} ${fx},${fy}`}
      fill="none"
      {...ink}
      strokeWidth={w}
    />
  );
}

function Horse({
  phase,
  gallop,
  coat = HORSE,
}: {
  phase: number;
  gallop: number;
  coat?: string;
}) {
  const s = (o: number) => Math.sin(phase + o) * (0.25 + gallop * 0.45);
  return (
    <g>
      {/* 꼬리 */}
      <path
        d="M -18 -27 C -27 -26 -29 -19 -31 -12"
        fill="none"
        {...ink}
        stroke={HAIR}
        strokeWidth={4}
      />
      {/* 뒷다리·앞다리(안쪽 먼저) */}
      <Leg x={-9} y={-19} swing={s(Math.PI)} />
      <Leg x={9} y={-19} swing={s(0)} />
      <path
        d="M -18 -26 C -20 -34 -8 -36 6 -34 C 14 -33 18 -31 20 -28 C 21 -22 16 -18 8 -18 L -12 -18 C -18 -18 -20 -21 -18 -26 Z"
        fill={coat}
        {...ink}
      />
      {/* 배 그늘 */}
      <path
        d="M -14 -20 C -4 -18 6 -18 14 -20"
        fill="none"
        stroke="#5e3d25"
        strokeWidth={3}
        opacity={0.6}
      />
      <path
        d="M 14 -32 C 18 -40 22 -46 26 -48 L 33 -44 C 34 -41 31 -39 28 -40 L 24 -38 C 22 -34 20 -30 18 -27 Z"
        fill={coat}
        {...ink}
      />
      <path
        d="M 15 -35 C 18 -42 21 -46 26 -49"
        fill="none"
        stroke={HAIR}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <Leg x={-13} y={-20} swing={s(Math.PI + 0.7)} />
      <Leg x={13} y={-20} swing={s(0.7)} />
    </g>
  );
}

/** 말 탄 사람: 털모자·델(진영 색)·금색 띠. weapon: 창 또는 활 */
function Rider({
  color,
  bow,
  lean,
  armor,
}: {
  color: string;
  bow: boolean;
  lean: number;
  armor?: boolean;
}) {
  return (
    <g transform={`rotate(${lean} 2 -32)`}>
      <path
        d="M -4 -33 C -6 -44 -3 -51 3 -51 C 9 -51 11 -45 10 -33 Z"
        fill={armor ? ARMOR : color}
        {...ink}
      />
      {/* 쇠갑옷이면 진영 색은 겉옷 자락으로 */}
      {armor ? (
        <path
          d="M -5 -33 L -8 -27 L 4 -27 L 10 -33 Z"
          fill={color}
          {...ink}
          strokeWidth={2}
        />
      ) : (
        <path d="M -4 -38 L 10 -38" stroke={GOLD} strokeWidth={3} />
      )}
      {bow ? (
        <>
          <path d="M 16 -58 C 24 -52 24 -40 16 -34" fill="none" {...ink} />
          <path d="M 16 -58 L 16 -34" stroke={INK} strokeWidth={1.2} />
          <path d="M 4 -46 L 16 -46" {...ink} strokeWidth={3.5} />
        </>
      ) : (
        <>
          <path d="M -6 -30 L 30 -62" {...ink} strokeWidth={2.5} />
          <path
            d="M 30 -62 L 27 -55 M 30 -62 L 23 -60"
            {...ink}
            strokeWidth={2}
          />
          <path d="M 4 -45 L 12 -48" {...ink} strokeWidth={3.5} />
        </>
      )}
      <circle cx={3} cy={-56} r={5} fill={SKIN} {...ink} />
      {armor ? (
        <path
          d="M -2.5 -56 C -2 -65 8 -65 8.5 -56 Z M 3 -65 L 3 -69"
          fill={STEEL}
          {...ink}
        />
      ) : (
        <>
          <path d="M -3 -57 C -3 -66 9 -66 9 -57 Z" fill={HAT} {...ink} />
          <path
            d="M -4 -57 L 10 -57"
            stroke={HAIR}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

/** 걷는 사람: 투구·창·둥근 방패(진영 색) 또는 활 */
function Soldier({
  color,
  phase,
  bow,
  lean,
  armor,
}: {
  color: string;
  phase: number;
  bow: boolean;
  lean: number;
  armor?: boolean;
}) {
  const s = Math.sin(phase) * 0.45;
  return (
    <g transform={`rotate(${lean} 0 -14)`}>
      <Leg x={-2} y={-16} swing={-s} w={3.5} />
      <Leg x={2} y={-16} swing={s} w={3.5} />
      <path
        d="M -6 -15 C -8 -28 -5 -36 1 -36 C 7 -36 9 -28 7 -15 Z"
        fill={armor ? ARMOR : color}
        {...ink}
      />
      <path d="M -6 -21 L 7 -21" stroke={GOLD} strokeWidth={2.5} />
      <circle cx={1} cy={-41} r={5} fill={SKIN} {...ink} />
      <path
        d="M -4.5 -42 C -4 -50 6 -50 6.5 -42 Z M 1 -50 L 1 -53"
        fill={STEEL}
        {...ink}
      />
      {bow ? (
        <>
          <path d="M 12 -46 C 19 -40 19 -28 12 -22" fill="none" {...ink} />
          <path d="M 12 -46 L 12 -22" stroke={INK} strokeWidth={1.2} />
          <path d="M 2 -32 L 12 -34" {...ink} strokeWidth={3} />
        </>
      ) : (
        <>
          <path d="M 9 -2 L 9 -60" {...ink} strokeWidth={2.5} />
          <path
            d="M 9 -60 L 7 -54 L 11 -54 Z"
            fill={STEEL}
            {...ink}
            strokeWidth={1.5}
          />
          <circle cx={7} cy={-24} r={8} fill={color} {...ink} />
          <circle
            cx={7}
            cy={-24}
            r={2.5}
            fill={GOLD}
            {...ink}
            strokeWidth={1.5}
          />
        </>
      )}
    </g>
  );
}

/** 깃발(대장만): 툭(말꼬리 깃대), 십자 깃발, 삼각 깃발, 네모 깃발 */
export function Flag({
  kind,
  color,
  x,
  y,
}: {
  kind: FlagKind;
  color: string;
  x: number;
  y: number;
}) {
  if (kind === "none") return null;
  const top = y - 34;
  return (
    <g>
      <path d={`M ${x} ${y} L ${x} ${top}`} {...ink} strokeWidth={2.5} />
      {kind === "tug" && (
        <>
          {/* 말꼬리 깃대(술데): 삼지창 끝 + 둥근 판 + 가는 말총, 아래에 진영 색 천 - 크게 그려도 깃발로 읽히게 */}
          <path
            d={`M ${x - 4} ${top} L ${x} ${top - 7} L ${x + 4} ${top} M ${x} ${top - 7} L ${x} ${top}`}
            fill="none"
            {...ink}
            strokeWidth={2}
          />
          <path
            d={`M ${x} ${top + 2} C ${x - 5} ${top + 7} ${x - 6} ${top + 11} ${x - 5} ${top + 15} M ${x} ${top + 2} C ${x - 1} ${top + 8} ${x} ${top + 12} ${x + 1} ${top + 16} M ${x} ${top + 2} C ${x + 4} ${top + 7} ${x + 5} ${top + 11} ${x + 5} ${top + 14}`}
            fill="none"
            stroke="#6b4a33"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <circle
            cx={x}
            cy={top + 2}
            r={3}
            fill={GOLD}
            {...ink}
            strokeWidth={1.5}
          />
          <path
            d={`M ${x} ${top + 17} L ${x - 17} ${top + 21} L ${x} ${top + 26} Z`}
            fill={color}
            {...ink}
            strokeWidth={2}
          />
        </>
      )}
      {kind === "pennant" && (
        <path
          d={`M ${x} ${top} L ${x - 20} ${top + 6} L ${x} ${top + 12} Z`}
          fill={color}
          {...ink}
          strokeWidth={2}
        />
      )}
      {(kind === "cross" || kind === "banner") && (
        <>
          <path
            d={`M ${x} ${top} L ${x - 18} ${top + 1} L ${x - 17} ${top + 14} L ${x} ${top + 13} Z`}
            fill={color}
            {...ink}
            strokeWidth={2}
          />
          {/* 정교회 십자(위 짧은 가로대 + 가운데 + 기운 발판) - 천 끝까지 닿는 십자는 북유럽 나라 국기(스웨덴)처럼 읽혔다 */}
          {kind === "cross" && (
            <path
              d={`M ${x - 9} ${top + 2.5} L ${x - 8.7} ${top + 12} M ${x - 11} ${top + 4.5} L ${x - 6.6} ${top + 4.5} M ${x - 12.5} ${top + 7} L ${x - 5.2} ${top + 7} M ${x - 11} ${top + 10.4} L ${x - 6.6} ${top + 9.2}`}
              stroke="#efe3c8"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          )}
        </>
      )}
    </g>
  );
}

/** 먼지(달릴 때, 뒤쪽으로) - time(초)로만 정해져 같은 프레임은 늘 같은 그림 */
export function Dust({ time, amount }: { time: number; amount: number }) {
  if (amount <= 0) return null;
  return (
    <g opacity={0.55 * amount}>
      {[0, 1, 2, 3].map((j) => {
        const k = (time * 1.6 + j * 0.25) % 1;
        return (
          <circle
            key={j}
            cx={-22 - k * 26}
            cy={-3 - k * 8}
            r={3 + k * 7}
            fill="#b8a68a"
            opacity={1 - k}
          />
        );
      })}
    </g>
  );
}

/**
 * 접전 먼지 구름(바랜 황토색): 퍼지며 천천히 일렁인다. 크기는 화면 CSS px 기준 지름 약 140, grow 0~1로 퍼진다
 */
export function BattleCloud({
  time,
  grow,
  seed,
}: {
  time: number;
  grow: number;
  seed: number;
}) {
  return (
    <g filter="url(#scene-blur)" opacity={0.75}>
      {[0, 1, 2, 3, 4, 5, 6].map((j) => {
        const a = j * 0.9 + seed;
        const k = 0.5 + 0.5 * Math.sin(time * 0.9 + j * 1.7);
        const r = (18 + 14 * k) * (0.4 + 0.6 * grow);
        return (
          <ellipse
            key={j}
            cx={Math.cos(a) * 38 * grow}
            cy={-12 + Math.sin(a) * 12 * grow - 10 * k}
            rx={r * 1.5}
            ry={r}
            fill={j % 2 ? "#b39a72" : "#cbb48c"}
            opacity={0.55}
          />
        );
      })}
    </g>
  );
}

/** 부대 하나(오른쪽을 봄). phase: 걸음 위상(라디안), state에 따라 기울기·흔들림 */
export function UnitArt({
  kind,
  color,
  state,
  phase,
  horse,
  armor,
  vessel,
  rock = 0,
  aircraft,
  altitude,
}: {
  kind: UnitKind;
  color: string;
  state: UnitState;
  phase: number;
  /** 말 색(진영마다 - 쿠만은 흰 말을 섞는 식으로 진영을 가른다) */
  horse?: string;
  armor?: boolean;
  /** 배 종류(sceneShip)·흔들림 세기(폭풍) */
  vessel?: string;
  rock?: number;
  /** 비행기 종류(sceneAir)·나는 높이 */
  aircraft?: string;
  altitude?: number;
}) {
  const fast = state === "charge" || state === "flee";
  const moving = state !== "hold";
  const lean = fast ? 10 : 0;
  const bob = moving ? Math.abs(Math.sin(phase)) * (fast ? 2.5 : 1.2) : 0;
  const legPhase = moving ? phase : 0;
  switch (kind) {
    case "cavalry":
    case "horse-archer":
      return (
        <g transform={`translate(0 ${-bob})`}>
          <Horse
            phase={legPhase}
            gallop={fast ? 1 : moving ? 0.3 : 0}
            coat={horse}
          />
          <Rider
            color={color}
            bow={kind === "horse-archer"}
            lean={lean}
            armor={armor}
          />
        </g>
      );
    case "infantry":
    case "archer":
      return (
        <g transform={`translate(0 ${-bob * 0.6})`}>
          <Soldier
            color={color}
            phase={legPhase}
            bow={kind === "archer"}
            lean={lean}
            armor={armor}
          />
        </g>
      );
    case "camp":
      return (
        <g>
          <path
            d="M -20 0 L -20 -14 C -12 -26 12 -26 20 -14 L 20 0 Z"
            fill={CANVAS}
            {...ink}
          />
          <path
            d="M -20 -14 C -8 -10 8 -10 20 -14"
            fill="none"
            stroke={color}
            strokeWidth={3}
          />
          <path
            d="M -4 0 L -4 -9 L 4 -9 L 4 0"
            fill={HAIR}
            {...ink}
            strokeWidth={2}
          />
          <path d="M 0 -23 L 0 -30" {...ink} />
        </g>
      );
    case "siege":
      return (
        <g>
          <path d="M -16 0 L 0 -26 L 16 0 Z" fill="none" {...ink} />
          <path
            d={`M 0 -26 L ${-22 + Math.sin(phase) * 4} -40 M 0 -26 L 10 -18`}
            {...ink}
            strokeWidth={3.5}
          />
          <rect
            x={6}
            y={-20}
            width={9}
            height={8}
            fill={color}
            {...ink}
            strokeWidth={2}
          />
          <path d="M -18 0 L 18 0" {...ink} />
        </g>
      );
    case "ship":
      return (
        <ShipArt
          vessel={vessel}
          color={color}
          phase={phase}
          moving={moving}
          rock={rock}
        />
      );
    case "tank":
      return (
        <g
          transform={`translate(0 ${moving ? -Math.abs(Math.sin(phase * 2)) * 0.8 : 0})`}
        >
          <rect
            x={-22}
            y={-10}
            width={44}
            height={10}
            rx={5}
            fill="#4d4a40"
            {...ink}
          />
          {[-15, -5, 5, 15].map((x) => (
            <circle
              key={x}
              cx={x}
              cy={-5}
              r={3}
              fill={STEEL}
              {...ink}
              strokeWidth={1.5}
            />
          ))}
          <path
            d="M -20 -10 L -16 -19 L 18 -19 L 22 -10 Z"
            fill={color}
            {...ink}
          />
          <path
            d="M -8 -19 L -6 -27 L 8 -27 L 10 -19 Z"
            fill={color}
            {...ink}
          />
          <path d="M 9 -23 L 30 -23" {...ink} strokeWidth={3.5} />
        </g>
      );
    case "artillery":
      return (
        <g>
          <path d="M -14 -10 L 22 -20" {...ink} strokeWidth={6} />
          <path
            d="M -14 -10 L 22 -20"
            stroke={STEEL}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <path d="M -6 -12 L -20 0" {...ink} strokeWidth={3} />
          <circle cx={0} cy={-8} r={8} fill={color} {...ink} />
          <circle cx={0} cy={-8} r={2} fill={INK} />
        </g>
      );
    case "plane":
      return (
        <PlaneArt
          aircraft={aircraft}
          color={color}
          altitude={altitude}
          phase={phase}
        />
      );
  }
}

/** 지도 위 표시(서 있는 그림): 전투(엇갈린 칼), 진영(천막) */
export function MarkerArt({
  kind,
  color,
}: {
  kind: "battle" | "camp";
  color: string;
}) {
  if (kind === "camp")
    return <UnitArt kind="camp" color={color} state="hold" phase={0} />;
  return (
    <g transform="translate(0 -22)">
      <circle r={17} fill="#efe3c8" {...ink} />
      {[-1, 1].map((d) => (
        <g key={d} transform={`rotate(${d * 40})`}>
          <path d="M 0 -14 L 0 9" {...ink} strokeWidth={3.5} />
          <path d="M 0 -14 L 0 9" stroke={STEEL} strokeWidth={1.5} />
          <path d="M -5 7 L 5 7" {...ink} strokeWidth={3} />
        </g>
      ))}
      <circle r={3} fill={color} {...ink} strokeWidth={1.5} />
    </g>
  );
}

const WOOD = "#7a5a3a";
/**
 * 수레 원진의 수레 하나(서 있는 그림, 땅 y=0). side: 옆모습(바퀴 둘·덮개, 폭 약 34), end: 앞뒤 모습(바퀴 둘이 양쪽, 폭 약 18) -
 * 원진 둘레에서 화면 가로로 놓인 수레는 옆모습, 세로로 놓인 수레는 앞뒤 모습. color는 덮개 아래 띠(진영 색)
 */
export function WagonArt({
  view,
  color,
}: {
  view: "side" | "end";
  color: string;
}) {
  if (view === "end")
    return (
      <g>
        <Shadow w={14} />
        <path d="M -8 -5 L -8 -15 L 8 -15 L 8 -5 Z" fill={WOOD} {...ink} />
        <path d="M -9 -15 C -9 -27 9 -27 9 -15 Z" fill={CANVAS} {...ink} />
        <path d="M -8 -15 L 8 -15" stroke={color} strokeWidth={2.5} />
        {[-9, 9].map((x) => (
          <ellipse
            key={x}
            cx={x}
            cy={-5}
            rx={2.2}
            ry={5}
            fill={WOOD}
            {...ink}
            strokeWidth={2}
          />
        ))}
      </g>
    );
  return (
    <g>
      <Shadow w={22} />
      {/* 끌채 */}
      <path d="M 15 -8 L 23 -4" {...ink} strokeWidth={2.5} />
      <path d="M -16 -8 L 15 -8 L 13 -15 L -14 -15 Z" fill={WOOD} {...ink} />
      <path d="M -14 -15 C -14 -29 13 -29 13 -15 Z" fill={CANVAS} {...ink} />
      <path
        d="M -5 -27 L -6 -15 M 4 -27 L 4 -15"
        stroke={INK}
        strokeWidth={1.2}
        opacity={0.5}
      />
      <path d="M -14 -15 L 13 -15" stroke={color} strokeWidth={2.5} />
      {[-9, 8].map((x) => (
        <g key={x}>
          <circle cx={x} cy={-6} r={6} fill={WOOD} {...ink} strokeWidth={2.2} />
          <path
            d={`M ${x - 4} ${-6} L ${x + 4} ${-6} M ${x} ${-10} L ${x} ${-2}`}
            stroke={INK}
            strokeWidth={1.2}
          />
        </g>
      ))}
    </g>
  );
}

const ADOBE = "#c8ad85";
const ADOBE_DARK = "#a88c66";
const CHAR = "#4a3a2e";
const smooth01 = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const mixHex = (a: string, b: string, k: number) => {
  const p = (h: string, i: number) =>
    parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k)).join(",")})`;
};

/**
 * 포위된 성벽 도시(서 있는 그림, 땅 y=0, 폭 약 100): 안쪽 돔·첨탑·지붕, 앞 성벽(흉벽)·양끝 성탑·성문 두 탑, 성탑 위 진영 깃발.
 * crack 0~1 성벽에 금이 번짐, fall 0~1 흉벽·성탑이 무너져 폐허(낮고 들쭉날쭉한 벽 + 돌무더기, 안쪽 건물도 내려앉음),
 * burn 0~1 지금 불길 세기, charred 0~1 그을림(타고 난 뒤에도 남음). time(초)으로만 일렁여 같은 프레임은 늘 같은 그림
 */
export function CityArt({
  color,
  crack,
  fall,
  burn,
  charred,
  time,
  seed,
}: {
  color: string;
  crack: number;
  fall: number;
  burn: number;
  charred: number;
  time: number;
  seed: string;
}) {
  const r = rng(`${seed}:city`);
  const wallH = 17;
  const L = -46;
  const R = 46;
  // 무너진 벽 높이(칸마다 다르게) - 성한 높이에서 fall만큼 내려앉는다
  const step = 4;
  const broken: number[] = [];
  for (let x = L; x <= R + 0.01; x += step)
    broken.push(wallH * (0.25 + 0.45 * r()));
  const topAt = (i: number, x: number) => {
    // 흉벽: 6칸마다 3칸 솟음(무너지면 사라짐)
    const merlon = Math.floor((x - L) / 3) % 2 === 0 ? 4 : 0;
    const full = wallH + merlon * (1 - smooth01(0, 0.35, fall));
    return full + (broken[i] - full) * fall;
  };
  let wall = `M ${L} 0`;
  broken.forEach((_, i) => {
    const x = L + i * step;
    const y = -topAt(i, x);
    wall += ` L ${x} ${y.toFixed(2)} L ${Math.min(R, x + step).toFixed(2)} ${y.toFixed(2)}`;
  });
  wall += ` L ${R} 0 Z`;
  const wallFill = mixHex(ADOBE, CHAR, charred * 0.45);
  const towerFill = mixHex(ADOBE_DARK, CHAR, charred * 0.5);
  /** 성탑: 무너지면 위가 사선으로 잘린다 */
  const tower = (cx: number, w: number, h: number, k: number) => {
    const hh = h * (1 - fall * (0.45 + 0.25 * k));
    const lean = fall * (k - 0.5) * 6;
    const top = -hh;
    const crown = fall < 0.5 ? 3 * (1 - fall * 2) : 0;
    return (
      <g key={cx}>
        <path
          d={`M ${cx - w / 2} 0 L ${cx - w / 2} ${top + lean} L ${cx + w / 2} ${top - lean} L ${cx + w / 2} 0 Z`}
          fill={towerFill}
          {...ink}
          strokeWidth={2.2}
        />
        {crown > 0.2 && (
          <path
            d={`M ${cx - w / 2 - 1} ${top - crown} h ${w / 3 + 0.5} v ${crown} M ${cx + w / 2 + 1} ${top - crown} h ${-(w / 3 + 0.5)} v ${crown}`}
            fill="none"
            {...ink}
            strokeWidth={2}
          />
        )}
      </g>
    );
  };
  // 안쪽 건물(벽 위로 보이는 것): 돔, 첨탑, 지붕 둘 - 무너지면 내려앉고 그을린다
  const sink = 1 - 0.65 * fall;
  const bFill = mixHex("#d8c39c", CHAR, charred * 0.6);
  const domeFill = mixHex("#6f8a8e", CHAR, charred * 0.65);
  // 금: 벽 앞면에 갈라진 먹선(앞쪽부터 그려지듯 - pathLength로 crack만큼)
  const cracks = [0, 1, 2, 3].map((j) => {
    const x0 = L + 10 + j * 22 + (r() - 0.5) * 8;
    let d = `M ${x0.toFixed(1)} ${-wallH + 1}`;
    let x = x0;
    for (let y = -wallH + 5; y <= -1; y += 4) {
      x += (r() - 0.5) * 6;
      d += ` L ${x.toFixed(1)} ${y}`;
    }
    return d;
  });
  // 돌무더기(무너질수록 커짐)
  const rubble = [0, 1, 2, 3, 4].map((j) => {
    const cx = L + 8 + j * 20 + (r() - 0.5) * 8;
    const w = (6 + r() * 6) * fall;
    const h = (3 + r() * 3) * fall;
    return { cx, w, h };
  });
  // 불길 자리(건물·벽 위)
  const flames = [
    [-16, -30],
    [6, -26],
    [24, -28],
    [-34, -20],
    [36, -21],
    [-2, -18],
  ].map(([x, y], j) => ({
    x: x + (r() - 0.5) * 4,
    y: y * (0.6 + 0.4 * sink),
    j,
  }));
  return (
    <g>
      <Shadow w={56} />
      {/* 안쪽 건물 */}
      <g
        transform={`translate(0 ${((1 - sink) * 4).toFixed(2)}) scale(1 ${sink.toFixed(3)})`}
      >
        <path
          d="M 14 -17 L 14 -44 L 18 -44 L 18 -17 Z"
          fill={bFill}
          {...ink}
          strokeWidth={2}
        />
        <path
          d="M 12.5 -44 L 16 -50 L 19.5 -44 Z"
          fill={domeFill}
          {...ink}
          strokeWidth={1.8}
        />
        <path
          d="M -24 -17 L -24 -27 L -6 -27 L -6 -17 Z"
          fill={bFill}
          {...ink}
          strokeWidth={2}
        />
        <path
          d="M -24 -27 C -24 -40 -6 -40 -6 -27 Z"
          fill={domeFill}
          {...ink}
          strokeWidth={2}
        />
        <path
          d="M 24 -17 L 24 -25 L 36 -25 L 36 -17 Z"
          fill={bFill}
          {...ink}
          strokeWidth={2}
        />
        <path
          d="M -40 -17 L -40 -23 L -30 -23 L -30 -17 Z"
          fill={bFill}
          {...ink}
          strokeWidth={2}
        />
      </g>
      {/* 성벽 */}
      <path d={wall} fill={wallFill} {...ink} strokeWidth={2.4} />
      {/* 성문(두 탑 사이 아치) */}
      <path
        d="M -5 0 L -5 -8 C -5 -13 5 -13 5 -8 L 5 0 Z"
        fill={INK}
        opacity={0.8}
      />
      {tower(L, 11, 27, r())}
      {tower(R, 11, 27, r())}
      {tower(-10, 8, 23, r())}
      {tower(10, 8, 23, r())}
      {/* 진영 깃발(왼쪽 성탑 위) - 무너지기 시작하면 쓰러진다 */}
      {fall < 0.3 && (
        <g
          transform={`translate(${L} ${-27}) rotate(${(fall / 0.3) * 70})`}
          opacity={1 - fall / 0.3}
        >
          <path d="M 0 0 L 0 -14" {...ink} strokeWidth={2} />
          <path
            d="M 0 -14 L 10 -11 L 0 -8 Z"
            fill={color}
            {...ink}
            strokeWidth={1.5}
          />
        </g>
      )}
      {crack > 0 &&
        cracks.map((d, j) => (
          <path
            key={j}
            d={d}
            fill="none"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - Math.min(1, crack * 1.2 - j * 0.05)}
            opacity={0.85}
          />
        ))}
      {fall > 0 &&
        rubble.map((b, j) => (
          <path
            key={j}
            d={`M ${b.cx - b.w} 0 L ${b.cx - b.w * 0.4} ${-b.h} L ${b.cx + b.w * 0.3} ${-b.h * 0.8} L ${b.cx + b.w} 0 Z`}
            fill={wallFill}
            {...ink}
            strokeWidth={1.6}
          />
        ))}
      {/* 불길: 바깥 주황·안 노랑, 먹선 옅게, time으로 일렁임 */}
      {burn > 0.01 &&
        flames.map(({ x, y, j }) => {
          const flick =
            0.75 +
            0.25 * Math.sin(time * 9 + j * 2.3) * Math.sin(time * 5.3 + j);
          const h = 13 * burn * flick * (j < 3 ? 1 : 0.75);
          if (h < 0.6) return null;
          const w = h * 0.45;
          const sway = Math.sin(time * 4 + j * 1.7) * w * 0.35;
          const outer = `M ${x - w} ${y} C ${x - w} ${y - h * 0.5} ${x + sway - w * 0.2} ${y - h * 0.7} ${x + sway} ${y - h} C ${x + sway + w * 0.2} ${y - h * 0.7} ${x + w} ${y - h * 0.5} ${x + w} ${y} Z`;
          const ih = h * 0.55;
          const iw = w * 0.5;
          const inner = `M ${x - iw} ${y} C ${x - iw} ${y - ih * 0.5} ${x + sway * 0.6} ${y - ih * 0.8} ${x + sway * 0.6} ${y - ih} C ${x + sway * 0.6} ${y - ih * 0.8} ${x + iw} ${y - ih * 0.5} ${x + iw} ${y} Z`;
          return (
            <g key={j}>
              <path
                d={outer}
                fill="#d9772b"
                stroke={INK}
                strokeWidth={1.2}
                strokeOpacity={0.55}
              />
              <path d={inner} fill="#f2c14e" />
            </g>
          );
        })}
    </g>
  );
}

/**
 * 연기 기둥: 아래 진한 잿빛에서 위로 옅어지며 바람에 기울어 오른다(덩이 12개가 위로 흐르며 커지고 옅어짐 - time만으로 정해짐).
 * amount 0~1(불길 세기 + 잔불), 높이 약 200
 */
export function SmokeColumn({
  time,
  amount,
  seed,
}: {
  time: number;
  amount: number;
  seed: number;
}) {
  if (amount <= 0.01) return null;
  const N = 12;
  return (
    <g filter="url(#scene-blur)">
      {Array.from({ length: N }, (_, j) => {
        const k = (time * 0.16 + j / N + seed * 0.37) % 1;
        const y = -24 - k * 200;
        const x = k * k * 70 + Math.sin(time * 0.6 + j * 1.9) * 5 * (0.4 + k);
        const rr = 7 + k * 34;
        const o = amount * Math.pow(1 - k, 0.9) * smooth01(0, 0.12, k) * 0.6;
        return (
          <ellipse
            key={j}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            rx={(rr * 1.25).toFixed(2)}
            ry={rr.toFixed(2)}
            fill={mixHex("#3a322b", "#9a9080", k)}
            opacity={o.toFixed(3)}
          />
        );
      })}
    </g>
  );
}

/**
 * 인물 얼굴 메달(땅 위 부대·지점을 가리키는 꼬리 끝이 y=0): 반지름 30 둥근 얼굴(양피지 바탕), 진영 색 고리 + 먹 테두리, 아래로 꼬리.
 * href는 data URL(sceneFace). id는 clipPath 이름(메달마다 달라야 한다)
 */
export function FaceMedal({
  href,
  color,
  id,
}: {
  href: string;
  color: string;
  id: string;
}) {
  const R = 30;
  const cy = -(R + 14);
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx={0} cy={cy} r={R - 3} />
        </clipPath>
      </defs>
      {/* 꼬리 */}
      <path
        d={`M -7 ${cy + R - 3} L 0 -1 L 7 ${cy + R - 3} Z`}
        fill={color}
        {...ink}
        strokeWidth={2.4}
      />
      <circle
        cx={0}
        cy={cy}
        r={R + 1.5}
        fill={INK}
        opacity={0.18}
        transform="translate(2 2.5)"
      />
      <circle cx={0} cy={cy} r={R} fill={color} {...ink} strokeWidth={2.6} />
      <circle cx={0} cy={cy} r={R - 4.5} fill="#efe3c8" />
      <image
        href={href}
        x={-(R - 3)}
        y={cy - (R - 3)}
        width={(R - 3) * 2}
        height={(R - 3) * 2}
        clipPath={`url(#${id})`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle
        cx={0}
        cy={cy}
        r={R - 4.5}
        fill="none"
        stroke={INK}
        strokeWidth={1.6}
      />
    </g>
  );
}

/**
 * 병력 숫자(계기판처럼 자리마다 굴러감): value(이어지는 값)를 step 단위 자리까지 보이고 그 아래 자리는 0. 가장 낮은 보이는 자리는
 * 값을 따라 이어서 구르고, 윗자리는 아랫자리가 넘어갈 때(마지막 step 동안)만 구른다. digits = 최대 자리 수(자리를 고정해 흔들리지
 * 않게), 앞자리가 0이 되면 서서히 사라지며 숫자가 왼쪽으로 붙는다. 천 단위 쉼표. 크림 글자 + 먹 테두리(연도 표시와 같은 모양),
 * Baskerville 굵게(RMW 영상 숫자 글꼴), 아래 진영 색 밑줄. 원점 = 왼쪽 글자 바닥, 크기 fs(px)
 */
const NUM_FONT = "Baskerville, 'Big Caslon', 'Hoefler Text', Georgia, serif";
export function TroopCount({
  value,
  step,
  digits,
  fs,
  color,
  id,
  commas = true,
}: {
  value: number;
  step: number;
  digits: number;
  fs: number;
  /** 밑줄 색(없으면 밑줄 없음 - 연도 표시) */
  color?: string;
  id: string;
  /** 천 단위 쉼표(연도는 끔) */
  commas?: boolean;
}) {
  const adv = fs * 0.62;
  const comma = commas ? fs * 0.3 : 0;
  const v = Math.max(0, value);
  const pStep = Math.round(Math.log10(step));
  // 자리마다(높은 자리부터) 보이는 정도(앞자리 0이면 사라짐)
  const cols = Array.from({ length: digits }, (_, i) => digits - 1 - i);
  const show = (p: number) =>
    p === 0 ? 1 : Math.min(1, Math.max(0, (v / 10 ** p - 0.9) / 0.1));
  // 사라진 앞자리만큼 왼쪽으로(쉼표 포함)
  let hidden = 0;
  for (const p of cols) {
    const h = 1 - show(p);
    hidden += h * (adv + (commas && p > 0 && p % 3 === 0 ? comma : 0));
    if (h < 1) break;
  }
  let x = -hidden;
  /** 밑줄 시작: 처음 보이는 자리(사라진 앞자리 밑까지 긋지 않게) */
  let start: number | null = null;
  const parts: ReactNode[] = [];
  const glyph = (key: string, gx: number, gy: number, ch: string, o = 1) => (
    <text
      key={key}
      x={gx.toFixed(2)}
      y={gy.toFixed(2)}
      fontSize={fs.toFixed(2)}
      fontWeight={700}
      fontFamily={NUM_FONT}
      textAnchor="middle"
      fill="#efe3c8"
      stroke={INK}
      strokeWidth={(fs * 0.09).toFixed(2)}
      strokeLinejoin="round"
      paintOrder="stroke"
      opacity={o}
    >
      {ch}
    </text>
  );
  for (const p of cols) {
    const o = show(p);
    const cx = x + adv / 2;
    if (o > 0.001 && start === null) start = x + adv * (1 - o);
    if (o > 0.001) {
      if (p < pStep) parts.push(glyph(`d${p}`, cx, 0, "0", o));
      else {
        const unit = 10 ** p;
        const d = Math.floor(v / unit) % 10;
        const roll =
          p === pStep
            ? (v / unit) % 1
            : Math.min(1, Math.max(0, ((v % unit) - (unit - step)) / step));
        const lh = fs * 1.05;
        parts.push(
          <g key={`d${p}`} clipPath={`url(#${id}-c${p})`}>
            <clipPath id={`${id}-c${p}`}>
              <rect
                x={x - fs * 0.1}
                y={-fs * 0.95}
                width={adv + fs * 0.2}
                height={fs * 1.15}
              />
            </clipPath>
            {glyph(`a${p}`, cx, roll * lh, String(d), o)}
            {roll > 0.001 &&
              glyph(`b${p}`, cx, roll * lh - lh, String((d + 1) % 10), o)}
          </g>,
        );
      }
    }
    x += adv;
    if (commas && p > 0 && p % 3 === 0) {
      if (o > 0.001) parts.push(glyph(`c${p}`, x + comma / 2, 0, ",", o));
      x += comma;
    }
  }
  return (
    <g>
      {color && (
        <>
          <path
            d={`M ${((start ?? 0) + fs * 0.05).toFixed(2)} ${(fs * 0.2).toFixed(2)} L ${(x - fs * 0.05).toFixed(2)} ${(fs * 0.2).toFixed(2)}`}
            stroke={INK}
            strokeWidth={(fs * 0.16).toFixed(2)}
            strokeLinecap="round"
          />
          <path
            d={`M ${((start ?? 0) + fs * 0.05).toFixed(2)} ${(fs * 0.2).toFixed(2)} L ${(x - fs * 0.05).toFixed(2)} ${(fs * 0.2).toFixed(2)}`}
            stroke={color}
            strokeWidth={(fs * 0.08).toFixed(2)}
            strokeLinecap="round"
          />
        </>
      )}
      {parts}
    </g>
  );
}

/** 배 하나(작은 부대 - 대군은 sceneCrowd가 같은 모양을 canvas로): 물 높이 줄·항적·물결에 흔들림 */
export function ShipArt({
  vessel,
  color,
  phase,
  moving,
  rock,
}: {
  vessel?: string;
  color: string;
  phase: number;
  moving: boolean;
  rock: number;
}) {
  const fills: Record<string, string> = { ...SHIP_COLORS, side: color };
  const roll = Math.sin(phase * 0.5) * (2 + 8 * rock);
  const heave = Math.sin(phase * 0.37) * (0.5 + 2.5 * rock);
  return (
    <g>
      <path
        d="M -30 0.5 L 32 0.5"
        stroke="#efe6d2"
        strokeWidth={1.6}
        opacity={0.4}
      />
      {moving && (
        <g
          opacity={0.5}
          fill="none"
          stroke="#efe6d2"
          strokeWidth={1.8}
          strokeLinecap="round"
        >
          <path d="M -26 0 C -42 1.5 -58 3 -78 4" />
          <path d="M -26 -0.5 C -40 -1.5 -55 -2 -72 -2.5" />
        </g>
      )}
      <g
        transform={`translate(0 ${heave.toFixed(2)}) rotate(${roll.toFixed(2)})`}
      >
        {SHIPS[vesselOf(vessel)].map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.fill ? fills[p.fill] : "none"}
            {...ink}
            strokeWidth={p.w ?? W}
          />
        ))}
      </g>
    </g>
  );
}

/** 비행기 하나(작은 부대 - 편대는 sceneCrowd가 같은 모양을 canvas로): 땅에 그림자, 높이 altitude 위에 옆모습 */
export function PlaneArt({
  aircraft,
  color,
  altitude = 110,
  phase,
}: {
  aircraft?: string;
  color: string;
  altitude?: number;
  phase: number;
}) {
  const kind = aircraftOf(aircraft);
  const fills: Record<string, string> = {
    ...PLANE_COLORS[kind],
    ...PLANE_FIXED,
    side: color,
  };
  const spread = 1 + altitude / 300;
  return (
    <g>
      <ellipse rx={26 * spread} ry={4 * spread} fill={INK} opacity={0.2} />
      <g
        transform={`translate(0 ${(-altitude + Math.sin(phase * 0.3) * 1.5).toFixed(2)})`}
      >
        {PLANES[kind].map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.fill ? fills[p.fill] : "none"}
            {...ink}
            strokeWidth={p.w ?? 2.2}
          />
        ))}
        <ellipse
          cx={kind === "fighter" ? 23.5 : 35}
          rx={1.6}
          ry={7}
          fill="#efe6d2"
          opacity={0.25}
        />
      </g>
    </g>
  );
}

/**
 * 폭탄 하나(땅 y=0 기준, 폭발 지름 약 60): sec = 떨어뜨린 뒤 초. 0~0.7 떨어지는 폭탄(높이 drop에서), 0.7~1.3 불덩이(번쩍이며
 * 커졌다 사그라짐), 그 뒤 연기가 3초 동안 오르며 퍼지고, 땅에는 패인 자국이 남는다
 */
export function Bomb({
  sec,
  drop,
  seed,
}: {
  sec: number;
  drop: number;
  seed: number;
}) {
  if (sec < 0) return null;
  const FALL = 0.7;
  if (sec < FALL) {
    const k = sec / FALL;
    const y = -drop * (1 - k * k);
    return (
      <g transform={`translate(0 ${y.toFixed(2)})`}>
        <path
          d="M 0 -6 C 2.5 -6 2.5 3 0 5 C -2.5 3 -2.5 -6 0 -6 Z M -2 -7 L 2 -7 L 0 -4 Z"
          fill={INK}
        />
      </g>
    );
  }
  const b = sec - FALL;
  const fire = b < 0.6 ? Math.sin((b / 0.6) * Math.PI) : 0;
  const grow = Math.min(1, b / 0.25);
  return (
    <g>
      {/* 패인 자국 */}
      <ellipse
        rx={16}
        ry={4.5}
        fill={INK}
        opacity={0.35 * Math.min(1, b / 0.3)}
      />
      {/* 연기(위로 퍼짐) */}
      <g filter="url(#scene-blur)">
        {[0, 1, 2, 3, 4].map((j) => {
          const k = Math.min(1, b / 3);
          const age = Math.max(0, k - j * 0.06);
          if (age <= 0) return null;
          const x = Math.sin(seed * 3 + j * 1.9) * 8 * (1 + age * 2);
          const y = -10 - age * (40 + j * 12);
          const r = 8 + age * (18 + j * 3);
          return (
            <circle
              key={j}
              cx={x}
              cy={y}
              r={r}
              fill={j % 2 ? "#4a4038" : "#6a5f52"}
              opacity={0.55 * (1 - age) ** 1.2}
            />
          );
        })}
      </g>
      {/* 불덩이: 흐리게 번지는 섬광 + 크기·자리가 제각각인 불 덩이 + 튀는 파편(동그라미 묶음은 화면 장치처럼 보였다) */}
      {fire > 0.01 && (
        <g>
          <g filter="url(#scene-blur)">
            <ellipse
              cy={-8}
              rx={30 * grow}
              ry={20 * grow}
              fill="#f2c14e"
              opacity={0.45 * fire}
            />
          </g>
          {[0, 1, 2, 3, 4, 5].map((j) => {
            const a = seed * 2.3 + j * 1.13;
            const d = (4 + (j % 3) * 5) * grow;
            const r = (11 - j * 1.2) * grow * (0.6 + 0.4 * fire);
            return (
              <circle
                key={j}
                cx={Math.cos(a) * d}
                cy={-10 + Math.sin(a) * d * 0.7 - j * 1.5 * grow}
                r={Math.max(0, r)}
                fill={
                  j % 3 === 1 ? "#f2c14e" : j % 3 === 2 ? "#e89a3c" : "#d0652a"
                }
                opacity={fire * (0.85 - j * 0.06)}
              />
            );
          })}
          <g
            stroke={INK}
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={fire}
          >
            {[0, 1, 2, 3, 4].map((j) => {
              const a =
                -Math.PI * (0.15 + 0.7 * ((j * 0.37 + seed * 0.21) % 1));
              const r0 = 14 * grow;
              const r1 = (22 + j * 3) * grow;
              return (
                <path
                  key={j}
                  d={`M ${(Math.cos(a) * r0).toFixed(1)} ${(-8 + Math.sin(a) * r0).toFixed(1)} L ${(Math.cos(a) * r1).toFixed(1)} ${(-8 + Math.sin(a) * r1).toFixed(1)}`}
                />
              );
            })}
          </g>
        </g>
      )}
    </g>
  );
}

/** 대공포 연기 꽃(공중, 지름 약 30): sec = 터진 뒤 초 - 번쩍 → 검은 연기 덩이가 커지며 2.5초 동안 옅어짐 */
export function Flak({ sec }: { sec: number }) {
  if (sec < 0 || sec > 2.8) return null;
  const grow = Math.min(1, sec / 0.25);
  const fade = 1 - Math.min(1, sec / 2.8);
  return (
    <g>
      {sec < 0.12 && <circle r={9} fill="#f2c14e" opacity={1 - sec / 0.12} />}
      <g filter="url(#scene-blur)">
        <circle
          r={(10 + sec * 3) * grow}
          fill="#3a332c"
          opacity={0.75 * fade}
        />
        <circle
          cx={5}
          cy={-3}
          r={(7 + sec * 2) * grow}
          fill="#2b2620"
          opacity={0.6 * fade}
        />
      </g>
    </g>
  );
}
