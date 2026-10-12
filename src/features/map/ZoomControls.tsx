"use client";

import { MAX_ZOOM, useUi } from "@/store/ui";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";

const button =
  "flex size-10 items-center justify-center text-muted transition-colors hover:bg-chip hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent";

/** 지도 확대·축소 버튼 (휠·핀치·두 번 탭과 같은 배율 상태를 쓴다) */
export function ZoomControls() {
  const { messages } = useI18n();
  const zoom = useUi((s) => s.zoom);
  const setZoom = useUi((s) => s.setZoom);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface/95 backdrop-blur">
      <button
        type="button"
        aria-label={messages.ui.zoomIn}
        title={messages.ui.zoomIn}
        disabled={zoom >= MAX_ZOOM}
        onClick={() => setZoom(zoom * 1.6)}
        className={button}
      >
        <PlusIcon className="size-[18px]" />
      </button>
      <span aria-hidden className="h-px bg-line" />
      <button
        type="button"
        aria-label={messages.ui.zoomOut}
        title={messages.ui.zoomOut}
        disabled={zoom <= 1}
        onClick={() => setZoom(zoom / 1.6)}
        className={button}
      >
        <MinusIcon className="size-[18px]" />
      </button>
    </div>
  );
}
