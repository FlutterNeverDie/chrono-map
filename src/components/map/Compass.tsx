"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHydrated } from "./useHydrated";
import { XIcon } from "@/components/ui/icons";

/** 처음 알려 주기를 이미 봤는지(localStorage) - 본 지도·주제 지도·전쟁 지도가 같이 쓴다(한 번 봤으면 어느 지도에서도 다시 안 띄움) */
const HINT_KEY = "viewHint";

/**
 * 지도 나침반(구글 어스처럼, 도메인 모름): 늘 보인다(사용자 결정 2026-10-21 - 돌릴 수 있다는 걸 알게).
 * 누르면 되돌리기(onReset - 북쪽이 위·평평하면 아무 일 없음), 잡고 돌리면 onTurn(돌린 만큼 더한 방향)으로 지도가 같이 돈다.
 * 바늘(빨간 쪽)은 지금 화면에서 북쪽. 돌리기·기울이기 자체는 지도에서 직접 - 아직 안 써 봤으면 나침반 옆에 그 방법을 한 번 알려 준다
 * (휴대폰은 나침반 아래, 데스크톱은 위).
 * 자리(place)는 쓰는 화면이 정한다(위에 떠 있는 것·패널과 겹치지 않게). 문구도 넘겨받는다(components는 i18n을 모름).
 */
export function Compass({
  heading,
  tilt,
  onReset,
  onTurnStart,
  onTurn,
  onTurnEnd,
  place,
  text,
  side,
}: {
  /** 돌린 만큼 계속 더한 방향(도) - 359 → 360도 바늘이 짧게 돈다 */
  heading: number;
  tilt: number;
  onReset: () => void;
  onTurnStart: () => void;
  onTurn: (heading: number) => void;
  onTurnEnd: () => void;
  place: string;
  text: { reset: string; hintMouse: string; hintTouch: string; close: string };
  /** 나침반 옆(시작 쪽)에 늘 같이 보일 것 - 지도마다 유튜브 버튼 */
  side?: ReactNode;
}) {
  const hydrated = useHydrated();
  const [closed, setClosed] = useState(false);
  const turned = Math.round(heading) % 360 !== 0 || tilt > 0.5;

  // 한 번 써 봤으면(돌리거나 기울임) 다시 알려 주지 않는다
  useEffect(() => {
    if (!turned) return;
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }, [turned]);
  let seen = true;
  if (hydrated)
    try {
      seen = localStorage.getItem(HINT_KEY) === "1";
    } catch {}
  const coarse = hydrated && matchMedia("(pointer: coarse)").matches;

  /** 잡고 돌리기: 나침반 가운데·시작 손가락 각도·방향, 움직였는지(움직이지 않았으면 누르기) */
  const drag = useRef<{
    cx: number;
    cy: number;
    angle: number;
    from: number;
    moved: boolean;
  } | null>(null);
  const dragged = useRef(false);
  const angleAt = (x: number, y: number) =>
    (Math.atan2(y - drag.current!.cy, x - drag.current!.cx) * 180) / Math.PI;

  const showHint = !turned && !seen && !closed;
  return (
    <div
      className={`${place} pointer-events-none flex flex-col items-end gap-2 lg:flex-col-reverse`}
    >
      <div className="flex items-center gap-2">
        {side}
        <button
          type="button"
          aria-label={text.reset}
          title={text.reset}
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              cx: r.left + r.width / 2,
              cy: r.top + r.height / 2,
              angle: 0,
              from: heading,
              moved: false,
            };
            drag.current.angle = angleAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const turnedBy =
              ((angleAt(e.clientX, e.clientY) - d.angle + 540) % 360) - 180;
            if (!d.moved && Math.abs(turnedBy) < 8) return;
            if (!d.moved) {
              d.moved = true;
              onTurnStart();
            }
            // 바늘이 손가락을 따라 돌게(바늘 = -방향)
            onTurn(d.from - turnedBy);
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            if (!d?.moved) return;
            dragged.current = true;
            onTurnEnd();
          }}
          onPointerCancel={() => {
            const d = drag.current;
            drag.current = null;
            if (d?.moved) onTurnEnd();
          }}
          onClick={() => {
            // 잡고 돌린 뒤 따라오는 click은 되돌리기가 아니다
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            onReset();
          }}
          className="pointer-events-auto flex size-12 touch-none items-center justify-center rounded-full border border-line bg-background/92 text-foreground shadow-sm transition-colors hover:bg-chip"
        >
          {/* 위쪽 테두리를 따라 한 호의 양 끝에 화살촉(좌우 어느 쪽으로든 돌릴 수 있다는 표시, 고정) + 바늘(빨간 쪽 = 지금 화면에서 북쪽,
            판이 -heading 돌아 있으므로 같이 돈다 - 돌린 만큼 더한 값이라 359 → 360도 짧게). 시안 C(사용자 결정 2026-10-21) */}
          <svg viewBox="0 0 24 24" aria-hidden className="size-8">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1.5}
            />
            <path
              d="M3.34 7A10 10 0 0 1 20.66 7"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
            <path d="M21.86 9.08L19.1 7.9L22.22 6.1Z" fill="currentColor" />
            <path d="M2.14 9.08L1.78 6.1L4.9 7.9Z" fill="currentColor" />
            <g
              style={{
                transform: `rotate(${-heading}deg)`,
                transformOrigin: "12px 12px",
              }}
            >
              <path d="M12 5.2 14.6 12H9.4Z" fill="var(--accent)" />
              <path
                d="M12 18.8 9.4 12h5.2Z"
                fill="currentColor"
                fillOpacity={0.45}
              />
            </g>
          </svg>
        </button>
      </div>
      {showHint && (
        <div
          role="note"
          className="pointer-events-auto flex max-w-[12.5rem] items-start rounded-lg border border-line bg-background/92 py-1 ps-3 text-sm leading-snug shadow-sm lg:max-w-[20rem]"
        >
          <p className="py-2">{coarse ? text.hintTouch : text.hintMouse}</p>
          <button
            type="button"
            aria-label={text.close}
            onClick={() => {
              setClosed(true);
              try {
                localStorage.setItem(HINT_KEY, "1");
              } catch {}
            }}
            className="flex size-11 shrink-0 items-center justify-center text-muted hover:text-foreground"
          >
            <XIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
