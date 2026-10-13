/** 사이트 주소. 배포 후 실제 도메인을 NEXT_PUBLIC_SITE_URL로 지정한다(사이트맵·robots에 쓰임) */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://chrono-map.histlab.workers.dev"
).replace(/\/$/, "");
