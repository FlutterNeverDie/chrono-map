"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { WarList } from "./WarList";

/** 전쟁 지도 목록 대화상자. 상단 바의 "전쟁 지도" 탭에서 연다. Esc·바깥 누르면 닫힘 */
export function WarsDialog({
  open,
  onClose,
  current,
}: {
  open: boolean;
  onClose: () => void;
  current?: string;
}) {
  const { locale, messages } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  // body 바로 아래에 띄운다: 상단 바 안에 두면 하단 바 등 다른 층이 대화상자를 덮는다
  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={messages.wars.indexTitle}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-background shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">{messages.wars.indexTitle}</h2>
            <p className="mt-1 text-[15px] text-muted">
              {messages.wars.indexDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 shrink-0 rounded-md border border-line px-4 text-sm font-medium hover:bg-chip"
          >
            {messages.ui.close}
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 py-6">
          <WarList locale={locale} messages={messages} current={current} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
