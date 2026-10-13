import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 백엔드 없이 정적 HTML로만 빌드 (Vercel 정적 호스팅)
  output: "export",
  images: { unoptimized: true },
  // 개발 모드 좌측 하단의 Next.js 도구 버튼(영어 전용)을 숨긴다. 배포본에는 원래 없다
  devIndicators: false,
  // 루트 레이아웃이 두 개((home)·[locale])라 사이트 전체 404는 app/global-not-found.tsx로 만든다
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
