"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { ADSENSE_CLIENT, AD_SLOTS, type AdSlotName } from "./config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 광고 한 칸(반응형 디스플레이). 게시자 ID·광고 단위 ID가 없으면 아무것도 그리지 않는다.
 * 개발 모드에서는 회색 자리표시자만(실제 광고 요청 금지 — 무효 트래픽).
 * 자리 높이를 미리 잡아 광고가 늦게 떠도 글이 밀리지 않게 한다(CLS).
 */
export function AdSlot({
  name,
  className,
}: {
  name: AdSlotName;
  className?: string;
}) {
  const slot = AD_SLOTS[name];
  const pushed = useRef(false);
  const live =
    !!ADSENSE_CLIENT && !!slot && process.env.NODE_ENV === "production";

  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle ??= []).push({});
    } catch {
      // 광고 차단기 등 — 화면에는 빈 자리만 남는다
    }
  }, [live]);

  if (!ADSENSE_CLIENT || !slot) return null;
  return (
    <div className={clsx("min-h-[280px] w-full overflow-hidden", className)}>
      {live ? (
        <ins
          className="adsbygoogle block"
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
          AD · {name}
        </div>
      )}
    </div>
  );
}
