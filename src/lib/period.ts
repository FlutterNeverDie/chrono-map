import type { Locale } from "./types";

/**
 * 연도 선택 단위. 기원전은 세기(100년), 서기는 `step`년(기본 10년, 본 지도 설정에서 5·10·30·50·100).
 *   기원전 3세기 = -300 ~ -201,  710년대 = 710 ~ 719,  5년 단위 1490 ~ 1494
 * 앱의 "현재 선택"은 항상 이 기간 하나다(연도 하나가 아니다).
 * 기원전은 사건·국경 데이터가 성겨 설정과 상관없이 세기 단위다.
 */
export type Period = {
  start: number;
  end: number;
  /** century: 기원전 세기, decade: 서기 10년, years: 서기 그 밖의 단위(이름 대신 연도 범위로 표시) */
  kind: "century" | "decade" | "years";
};

/** 서기 연도 단위(설정에서 고름) */
export const YEAR_STEPS = [5, 10, 30, 50, 100] as const;
export const DEFAULT_STEP = 10;

export function periodOf(year: number, step: number = DEFAULT_STEP): Period {
  if (year < 0) {
    const n = Math.ceil(-year / 100);
    return { start: -n * 100, end: -(n - 1) * 100 - 1, kind: "century" };
  }
  const start = Math.floor(year / step) * step;
  return {
    start: Math.max(1, start),
    end: start + step - 1,
    kind: step === 10 ? "decade" : "years",
  };
}

/** 이전(-1)/다음(+1) 기간. 0년은 건너뛴다 */
export function stepPeriod(
  p: Period,
  direction: 1 | -1,
  step: number = DEFAULT_STEP,
): Period {
  if (direction > 0) return periodOf(p.end + 1 === 0 ? 1 : p.end + 1, step);
  return periodOf(p.start - 1 === 0 ? -1 : p.start - 1, step);
}

/** 사건 기간과 선택 기간 사이 거리(년). 겹치면 0 */
export function distanceToPeriod(
  range: { start: number; end: number },
  p: Period,
): number {
  if (range.end < p.start) return p.start - range.end;
  if (range.start > p.end) return range.start - p.end;
  return 0;
}

/** 선택 기간과 함께 보여줄 앞뒤 범위(년). 오래된 시대일수록 넓다 */
export function periodWindow(p: Period): number {
  if (p.kind === "century") return 200;
  if (p.start < 1500) return 50;
  if (p.start < 1900) return 20;
  return 5;
}

const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];
function roman(n: number): string {
  let out = "";
  for (const [value, symbol] of ROMAN) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

function englishOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

/** 기간 표시: "기원전 3세기", "710년대", "3rd century BC", "710s" … */
export function formatPeriod(p: Period, locale: Locale): string {
  if (p.kind === "century") {
    const n = -p.start / 100;
    switch (locale) {
      case "ko":
        return `기원전 ${n}세기`;
      case "en":
        return `${englishOrdinal(n)} century BC`;
      case "zh":
        return `公元前${n}世纪`;
      case "es":
        return `siglo ${roman(n)} a. C.`;
      case "hi":
        return `ई.पू. ${n}वीं शताब्दी`;
      case "ar":
        return `القرن ${n} ق.م`;
      case "fr":
        return `${roman(n)}${n === 1 ? "er" : "e"} siècle av. J.-C.`;
      case "pt":
        return `século ${roman(n)} a.C.`;
    }
  }
  // 서기 1~9년(0년은 없음)은 "0년대"가 어색하므로, 10년이 아닌 단위는 이름이 없으므로 연도 범위로 쓴다: "1–9년", "AD 1–9", "1490–1494년"
  if (p.start === 1 || p.kind === "years")
    return (
      (locale === "en" && p.start < 1000 ? "AD " : "") +
      formatPeriodRange(p, locale)
    );
  const d = Math.floor(p.start / 10) * 10;
  switch (locale) {
    case "ko":
      return `${d}년대`;
    case "en":
      // "30s", "100s"는 1930년대·2세기로 읽히므로 1000년 전은 "AD 30s"
      return d < 1000 ? `AD ${d}s` : `${d}s`;
    case "zh":
      return `${d}年代`;
    case "es":
      return `década de ${d}`;
    case "hi":
      return `${d} का दशक`;
    case "ar":
      return `عقد ${d}`;
    case "fr":
      return `années ${d}`;
    case "pt":
      return `década de ${d}`;
  }
}

const RANGE: Record<Locale, { bc: string; ad: string }> = {
  ko: { bc: "기원전 {a}–{b}년", ad: "{a}–{b}년" },
  en: { bc: "{a}–{b} BC", ad: "{a}–{b}" },
  zh: { bc: "公元前{a}–{b}年", ad: "{a}–{b}年" },
  es: { bc: "{a}–{b} a. C.", ad: "{a}–{b}" },
  hi: { bc: "{a}–{b} ई.पू.", ad: "{a}–{b}" },
  ar: { bc: "{a}–{b} ق.م", ad: "{a}–{b}" },
  fr: { bc: "{a}–{b} av. J.-C.", ad: "{a}–{b}" },
  pt: { bc: "{a}–{b} a.C.", ad: "{a}–{b}" },
};

/** 기간의 실제 연도 범위: "1490–1499년", "기원전 300–201년", "300–201 BC" … */
export function formatPeriodRange(p: Period, locale: Locale): string {
  const f = RANGE[locale];
  const [a, b] = [Math.abs(p.start), Math.abs(p.end)];
  return (p.start < 0 ? f.bc : f.ad)
    .replace("{a}", String(a))
    .replace("{b}", String(b));
}
