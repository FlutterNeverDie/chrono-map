import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 백엔드 없이 정적 HTML로만 빌드 (Vercel 정적 호스팅)
  output: "export",
  images: { unoptimized: true },
  // 개발 모드 좌측 하단의 Next.js 도구 버튼(영어 전용)을 숨긴다. 배포본에는 원래 없다
  devIndicators: false,
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
