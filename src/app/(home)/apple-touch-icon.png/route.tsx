import { ImageResponse } from "next/og";

/** 홈 화면 아이콘(iOS 180×180 PNG, 빌드 때 /apple-touch-icon.png 파일로 만들어짐). 모양은 app/icon.svg와 같다 */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#2b2418" />
        <g
          fill="none"
          stroke="#faf6ec"
          strokeWidth="3.2"
          strokeLinecap="round"
        >
          <circle cx="32" cy="30" r="17" />
          <path d="M15 30h34M32 13a26 26 0 0 1 0 34M32 13a26 26 0 0 0 0 34" />
          <path d="M14 55h36" />
        </g>
        <circle
          cx="40"
          cy="55"
          r="4.5"
          fill="#c2410c"
          stroke="#faf6ec"
          strokeWidth="2"
        />
      </svg>
    ),
    { width: 180, height: 180 },
  );
}
