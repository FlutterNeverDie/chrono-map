/**
 * AdSense 설정 — 모두 배포 환경변수로 켠다(코드에 ID를 적지 않음). 값이 없으면 광고 관련 코드는 아무것도 그리지 않는다.
 *   NEXT_PUBLIC_ADSENSE_CLIENT        게시자 ID "ca-pub-0000000000000000" (스크립트·ads.txt)
 *   NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE  글 페이지(사건 상세·연도 페이지) 본문 광고 단위 ID
 */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export const AD_SLOTS = {
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE ?? "",
} as const;
export type AdSlotName = keyof typeof AD_SLOTS;

/** ads.txt 한 줄. 게시자 ID가 없으면 null */
export function adsTxtLine(): string | null {
  const pub = ADSENSE_CLIENT.replace(/^ca-/, "");
  return pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0` : null;
}
