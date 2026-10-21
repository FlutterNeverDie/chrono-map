"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { HistoryEvent } from "@/lib/types";

/** 사진 파일(npm run photos): s 정사각 400 - 목록 카드·지도 핀(큰 사진은 상세 페이지 features/pages) */
export const photoSrc = (id: string) => `/photos/${id}-s.webp`;

/**
 * 이번 방문에서 이미 받아 보여 준 사진 - 다시 그릴 때는 서서히가 아니라 바로 보인다. 목록은 화면에 보이는 카드만 그려서
 * 지도를 끌어 순서가 바뀌면 카드를 새로 만드는데, 그때마다 투명에서 다시 나타나 깜빡였다
 */
const shown = new Set<string>();

/** 목록 카드 제목 줄 왼쪽 작은 정사각 사진: 자리를 먼저 잡고, 처음 받을 때만 서서히 */
export function EventThumb({
  event,
  alt,
}: {
  event: HistoryEvent;
  alt: string;
}) {
  const src = photoSrc(event.id);
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(() => shown.has(src));
  const [fade] = useState(() => !shown.has(src));
  useEffect(() => {
    if (!ref.current?.complete) return;
    shown.add(src);
    setLoaded(true);
  }, [src]);
  return (
    <div className="size-16 shrink-0 overflow-hidden rounded-md bg-chip lg:size-20 dark:ring-1 dark:ring-line">
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기(이미지 최적화 없음), 미리 줄인 WebP */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => {
          shown.add(src);
          setLoaded(true);
        }}
        className={clsx(
          "size-full object-cover",
          fade && "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
