"use client";

import * as Slider from "@radix-ui/react-slider";
import { useHydrated } from "@/components/map/useHydrated";

/**
 * 설정 메뉴의 "지도 기울기" 한 줄(제목 + 슬라이더 + 지금 각도) - 세 지도 공용. 끄는 동안 지도가 바로 눕는다.
 * 값은 쓰는 쪽의 상태(본 지도 store/ui, 주제·전쟁 지도 components/map/tiltStore), 문구는 넘겨받는다.
 * 아래에 지도에서 직접 기울이는 방법 한 줄(휴대폰은 손가락, 컴퓨터는 마우스 - 나침반 처음 안내와 같은 문장, 그 안내는 한 번만 떠서)
 */
export function TiltSlider({
  label,
  value,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (tilt: number) => void;
  hint: { touch: string; mouse: string };
}) {
  const v = Math.round(value);
  const hydrated = useHydrated();
  const touch = hydrated && matchMedia("(pointer: coarse)").matches;
  return (
    <div className="pb-1">
      <div className="flex h-12 w-full items-center gap-3 px-3 text-base text-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinejoin="round"
          aria-hidden
          className="size-[22px] shrink-0 text-muted"
        >
          {/* 눕힌 판 */}
          <path d="M6 8h12l4 10H2z" />
        </svg>
        <span className="whitespace-nowrap">{label}</span>
        <Slider.Root
          min={0}
          max={max}
          step={1}
          value={[v]}
          onValueChange={([n]) => onChange(n)}
          className="relative ms-auto flex h-11 w-24 shrink-0 touch-none items-center select-none"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
            <Slider.Range className="absolute h-full rounded-full bg-accent" />
          </Slider.Track>
          <Slider.Thumb
            aria-label={label}
            aria-valuetext={`${v}°`}
            className="block size-5 rounded-full border-[3px] border-accent bg-surface shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </Slider.Root>
        <span className="w-8 shrink-0 text-end font-medium tabular-nums">
          {v}°
        </span>
      </div>
      {/* 제목 글자 줄에 맞춤(왼쪽 여백 + 아이콘 + 간격) */}
      <p className="ps-[calc(0.75rem+22px+0.75rem)] pe-3 text-sm leading-snug text-muted">
        {touch ? hint.touch : hint.mouse}
      </p>
    </div>
  );
}
