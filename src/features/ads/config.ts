/**
 * AdSense 설정. 게시자 ID·광고 단위 ID가 없으면 광고 관련 코드는 아무것도 그리지 않는다.
 * 값은 공개돼도 되는 값(페이지 HTML에 그대로 나감)이라 승인 후 여기 기본값으로 적어도 된다 — 배포 환경변수가 있으면 그게 우선.
 *   NEXT_PUBLIC_ADSENSE_CLIENT        게시자 ID "ca-pub-0000000000000000" (스크립트·ads.txt)
 *   NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE  글 페이지(사건 상세·연도 페이지) 본문 아래 광고 단위 ID
 *   NEXT_PUBLIC_ADSENSE_SLOT_INFEED   지도 화면 목록(사건·전투·항목 카드 사이) 광고 단위 ID
 *   NEXT_PUBLIC_ADS_PREVIEW=1         광고 자리만 회색으로 보여 주기(배치 확인용, 실제 광고 요청 없음)
 */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export const AD_SLOTS = {
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE ?? "",
  infeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED ?? "",
} as const;
export type AdSlotName = keyof typeof AD_SLOTS;

export const ADS_PREVIEW = process.env.NEXT_PUBLIC_ADS_PREVIEW === "1";

/** ads.txt 한 줄. 게시자 ID가 없으면 null */
export function adsTxtLine(): string | null {
  const pub = ADSENSE_CLIENT.replace(/^ca-/, "");
  return pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0` : null;
}
