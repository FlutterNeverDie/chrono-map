"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons";

/**
 * 사진 전체 화면(도메인 모름): 두 손가락 핀치·휠로 확대, 끌어서 옮기기, 두 번 탭으로 2.5배/원래 크기.
 * 닫기: X, Esc, 확대하지 않은 상태에서 사진 밖 누르기. 아래에 출처 줄(credit - 쓰는 쪽이 만든다).
 */
export function PhotoViewer({
  src,
  alt,
  credit,
  closeLabel,
  onClose,
}: {
  src: string;
  alt: string;
  credit: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
}) {
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{
    dist: number;
    mid: { x: number; y: number };
    view: typeof view;
  } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const clampK = (k: number) => Math.min(5, Math.max(1, k));
  /** 화면 점(cx, cy, 화면 가운데 기준) 밑의 사진 자리가 그대로 있게 배율을 바꾼다 */
  const zoomAt = (k: number, cx: number, cy: number) =>
    setView((v) => {
      const nk = clampK(k);
      if (nk === 1) return { k: 1, x: 0, y: 0 };
      return {
        k: nk,
        x: cx - ((cx - v.x) * nk) / v.k,
        y: cy - ((cy - v.y) * nk) / v.k,
      };
    });
  const center = (x: number, y: number) => ({
    x: x - innerWidth / 2,
    y: y - innerHeight / 2,
  });
  const snapshot = () => {
    const [a, b] = [...pointers.current.values()];
    start.current = {
      dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      mid: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a,
      view: viewRef.current,
    };
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={alt}
      className="fixed inset-0 z-50 flex touch-none flex-col bg-black/92 select-none"
      onWheel={(e) => {
        const c = center(e.clientX, e.clientY);
        zoomAt(view.k * Math.exp(-e.deltaY * 0.002), c.x, c.y);
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        moved.current = false;
        snapshot();
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId) || !start.current) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...pointers.current.values()];
        const s = start.current;
        if (b) {
          moved.current = true;
          const mid = center((a.x + b.x) / 2, (a.y + b.y) / 2);
          const from = center(s.mid.x, s.mid.y);
          const k = clampK(
            s.view.k * (Math.hypot(a.x - b.x, a.y - b.y) / s.dist),
          );
          // 시작 때 손가락 가운데 밑의 자리가 지금 손가락 가운데로
          setView({
            k,
            x: mid.x - ((from.x - s.view.x) * k) / s.view.k,
            y: mid.y - ((from.y - s.view.y) * k) / s.view.k,
          });
          return;
        }
        const dx = a.x - s.mid.x;
        const dy = a.y - s.mid.y;
        if (Math.hypot(dx, dy) > 6) moved.current = true;
        if (s.view.k > 1)
          setView({ ...s.view, x: s.view.x + dx, y: s.view.y + dy });
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size) return snapshot();
        start.current = null;
        if (moved.current) return;
        const now = Date.now();
        const c = center(e.clientX, e.clientY);
        if (now - lastTap.current < 300) {
          lastTap.current = 0;
          zoomAt(view.k > 1 ? 1 : 2.5, c.x, c.y);
          return;
        }
        lastTap.current = now;
        // 확대하지 않았을 때 사진 밖(검은 곳)을 누르면 닫는다
        if (view.k === 1 && e.target === e.currentTarget) onClose();
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        start.current = null;
      }}
    >
      <button
        type="button"
        aria-label={closeLabel}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={onClose}
        className="absolute end-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 flex size-12 items-center justify-center rounded-full bg-black/50 text-white"
      >
        <XIcon className="size-6" />
      </button>
      <div className="pointer-events-none flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기(이미지 최적화 없음), 미리 줄인 WebP */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          }}
        />
      </div>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className="px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-center text-sm text-white/80"
      >
        {credit}
      </div>
    </div>,
    document.body,
  );
}
