"use client";

import { useI18n } from "@/i18n/I18nProvider";

/** 국경 데이터 출처 표기 (CC BY 4.0 필수 조건) */
export function Attribution() {
  const { messages } = useI18n();
  return (
    <a
      href="https://github.com/Seshat-Global-History-Databank/cliopatria"
      target="_blank"
      rel="noreferrer"
      className="pointer-events-auto rounded bg-surface/70 px-1.5 py-0.5 text-[10px] text-muted backdrop-blur"
    >
      {messages.ui.borderSource}: Cliopatria (Seshat) · CC BY 4.0
    </a>
  );
}
