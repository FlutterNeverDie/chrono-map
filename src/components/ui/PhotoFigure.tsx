"use client";

import { useState } from "react";
import { PhotoViewer } from "./PhotoViewer";

/**
 * 글 페이지 큰 사진(도메인 모름): 원래 비율대로(가로 w·세로 h로 자리를 먼저 잡음, 화면 높이 70%까지) + 아래 출처 줄.
 * 누르면 전체 화면(PhotoViewer - 확대). 문구는 props.
 */
export function PhotoFigure({
  src,
  alt,
  width,
  height,
  credit,
  openLabel,
  closeLabel,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit: { text: string; href: string };
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const caption = (
    <a
      href={credit.href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-current/30 underline-offset-2"
    >
      {credit.text}
    </a>
  );
  return (
    <figure className="mt-6">
      <button
        type="button"
        aria-label={openLabel}
        onClick={() => setOpen(true)}
        className="block w-full overflow-hidden rounded-lg bg-chip dark:ring-1 dark:ring-line"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기(이미지 최적화 없음), 미리 줄인 WebP */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          className="mx-auto max-h-[70vh] w-auto object-contain"
          style={{ aspectRatio: `${width} / ${height}` }}
        />
      </button>
      <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>
      {open && (
        <PhotoViewer
          src={src}
          alt={alt}
          credit={caption}
          closeLabel={closeLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </figure>
  );
}
