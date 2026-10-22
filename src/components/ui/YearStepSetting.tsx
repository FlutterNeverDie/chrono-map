"use client";

import { DEFAULT_STEP, YEAR_STEPS } from "@/lib/period";
import { CalendarIcon, ChevronDownIcon } from "./icons";

const KEY = "yearStep";

/** 저장된 연도 단위(본 지도·주제 지도가 같은 값 - 한 곳에서 바꾸면 다른 지도도). 없거나 이상하면 기본 10년 */
export function loadYearStep(): number {
  try {
    const saved = Number(localStorage.getItem(KEY));
    if ((YEAR_STEPS as readonly number[]).includes(saved)) return saved;
  } catch {}
  return DEFAULT_STEP;
}

function saveYearStep(n: number) {
  try {
    if (n === DEFAULT_STEP) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(n));
  } catch {}
}

/**
 * 설정 메뉴의 "연도 단위"(1·3·5·10·50·100년, 기본 10) - 본 지도·주제 지도가 같이 쓴다. 한 줄: 제목 + 오른쪽 끝 고르기 상자
 * (보이는 건 값 + ▾, 실제 선택은 겹친 투명 <select> - 휴대폰은 기기 기본 선택창, LanguageSelect와 같은 방식).
 * 값은 쓰는 쪽의 상태, 고르면 저장하고 onChange로 알린다
 */
export function YearStepSetting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (step: number) => void;
}) {
  return (
    <label className="relative flex h-12 w-full items-center gap-3 rounded-md px-3 text-base text-foreground focus-within:ring-2 focus-within:ring-accent/40 hover:bg-chip">
      <CalendarIcon className="size-[22px] shrink-0 text-muted" />
      <span>{label}</span>
      <span className="ms-auto font-medium tabular-nums">{value}</span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          saveYearStep(n);
          onChange(n);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {YEAR_STEPS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
