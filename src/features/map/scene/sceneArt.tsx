import type { FlagKind, UnitKind, UnitState } from "./sceneData";

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
          {kind === "cross" && (
            <path
              d={`M ${x - 9} ${top + 2} L ${x - 8.5} ${top + 13} M ${x - 16} ${top + 7} L ${x - 1} ${top + 7}`}
              stroke={GOLD}
              strokeWidth={2.5}
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
}: {
  kind: UnitKind;
  color: string;
  state: UnitState;
  phase: number;
  /** 말 색(진영마다 - 쿠만은 흰 말을 섞는 식으로 진영을 가른다) */
  horse?: string;
  armor?: boolean;
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
        <g transform={`rotate(${Math.sin(phase) * 2})`}>
          <path
            d="M -24 -10 L 24 -10 L 16 0 L -18 0 Z"
            fill="#6b4a30"
            {...ink}
          />
          <path d="M 0 -10 L 0 -46" {...ink} />
          <path d="M 1 -44 C 14 -38 16 -24 1 -14 Z" fill={color} {...ink} />
        </g>
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
        <g transform="translate(0 -40)">
          <path
            d="M -24 0 C -16 -4 16 -4 26 0 C 16 4 -16 4 -24 0 Z"
            fill={color}
            {...ink}
          />
          <path
            d="M -4 -1 L -12 -14 L 4 -14 L 8 -1 Z M -20 -1 L -25 -9 L -18 -9 L -15 -1 Z"
            fill={color}
            {...ink}
            strokeWidth={2}
          />
          <circle cx={28} cy={0} r={2} fill={INK} />
        </g>
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
