"use client";

import clsx from "clsx";
import { useUi } from "@/store/ui";
import { useI18n } from "@/i18n/I18nProvider";

const TILTS = [0, 30, 50] as const;

/**
 * 설정 메뉴의 "지도 기울기": 위에서 내려다보기(0°) / 살짝(30°) / 많이(50°).
 * 지도에서 직접 바꿀 수도 있다 - 두 손가락을 같이 위아래로 쓸기, 마우스 오른쪽 단추·Ctrl(⌘)·Shift를 누르고 위아래로 끌기
 */
export function TiltSetting() {
  const { messages } = useI18n();
  const tilt = useUi((s) => s.tilt);
  const setTilt = useUi((s) => s.setTilt);
  return (
    <div className="px-3 py-2">
      <p className="text-sm text-muted">{messages.ui.mapTilt}</p>
      <div
        role="radiogroup"
        aria-label={messages.ui.mapTilt}
        className="mt-1.5 flex gap-1"
      >
        {TILTS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={Math.round(tilt) === n}
            onClick={() => setTilt(n)}
            className={clsx(
              "flex h-11 min-w-11 flex-1 items-center justify-center rounded-md text-base tabular-nums transition-colors",
              Math.round(tilt) === n
                ? "bg-foreground font-bold text-background"
                : "bg-chip hover:bg-line",
            )}
          >
            {n}°
          </button>
        ))}
      </div>
    </div>
  );
}
