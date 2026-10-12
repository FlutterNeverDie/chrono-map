import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 백엔드 없이 정적 HTML로만 빌드 (Vercel 정적 호스팅)
  output: "export",
  images: { unoptimized: true },
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
