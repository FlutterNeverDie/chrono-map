"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ADSENSE_CLIENT,
  ADS_PREVIEW,
  AD_SLOTS,
  type AdSlotName,
} from "./config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** 광고 종류별 미리 잡아 둘 높이(광고가 늦게 떠도 글·카드가 밀리지 않게 — CLS) */
const MIN_HEIGHT: Record<AdSlotName, string> = {
  article: "min-h-[280px]",
  infeed: "min-h-[250px]",
};

/**
 * 광고 한 칸(반응형 디스플레이) + 위에 작은 "광고" 표시(AdSense 권장).
 * 게시자 ID·광고 단위 ID가 없으면 아무것도 그리지 않는다(ADS_PREVIEW면 회색 자리만).
 * 개발 모드에서는 실제 광고를 요청하지 않는다(무효 트래픽).
 */
export function AdSlot({
  name,
  className,
}: {
  name: AdSlotName;
  className?: string;
}) {
  const { messages } = useI18n();
  const slot = AD_SLOTS[name];
  const pushed = useRef(false);
  const ready = !!ADSENSE_CLIENT && !!slot;
  const live = ready && process.env.NODE_ENV === "production";

  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle ??= []).push({});
    } catch {
      // 광고 차단기 등 — 화면에는 빈 자리만 남는다
    }
  }, [live]);

  // 실제 광고는 배포본에서만, 개발 서버에서는 ADS_PREVIEW일 때만 회색 자리(아니면 아무것도 안 그림 - 글·화면 확인을 가리지 않게)
  if (!live && !ADS_PREVIEW) return null;
  return (
    <aside
      aria-label={messages.ui.ad}
      // 목록 카드처럼 눌러도 카드 선택으로 번지지 않게
      onClick={(e) => e.stopPropagation()}
      // 애드센스가 광고를 못 채우면(<ins data-ad-status="unfilled">) "광고" 표시와 빈칸을 통째로 숨긴다
      className={clsx(
        "w-full has-[ins[data-ad-status=unfilled]]:hidden",
        className,
      )}
    >
      <p className="mb-1 px-1 text-xs text-muted">{messages.ui.ad}</p>
      <div
        className={clsx("w-full overflow-hidden rounded-lg", MIN_HEIGHT[name])}
      >
        {live ? (
          <ins
            className="adsbygoogle block"
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div
            className={clsx(
              "flex items-center justify-center rounded-lg border border-dashed border-line bg-surface text-sm text-muted",
              MIN_HEIGHT[name],
            )}
          >
            AD · {name}
          </div>
        )}
      </div>
    </aside>
  );
}
