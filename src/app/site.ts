/** 사이트 주소. 배포 후 실제 도메인을 NEXT_PUBLIC_SITE_URL로 지정한다(사이트맵·robots에 쓰임) */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://historymapworld.com"
).replace(/\/$/, "");

/** 문의 메일(설정 메뉴 "개발자에게 문의"). 연락처 페이지(features/pages/TextPage)와 같은 주소 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "oasa741@gmail.com";

/** 문의 메일 제목 앞머리 - 언어와 상관없이 같게 해서 받은 편지함에서 한 번에 거른다 */
export const MAIL_TAG = "[History Map World]";

/**
 * 검색 사이트 소유 확인 코드(메타 태그 content 값). 각 서비스에서 받은 코드를 넣고 배포하면 모든 페이지 <head>에 들어간다.
 * 공개돼도 괜찮은 값이다(사이트 HTML에 그대로 보임). 비어 있으면 태그를 넣지 않는다.
 *   google: Search Console "HTML 태그"(도메인 속성을 Cloudflare로 확인했다면 필요 없음)
 *   naver:  네이버 서치어드바이저 "HTML 태그"
 *   bing:   Bing 웹마스터 도구 "메타 태그"(Search Console에서 가져오기를 했다면 필요 없음)
 */
const SITE_VERIFICATION = {
  google: "",
  naver: "d6c027415c22ea89d50173c17dce451634e33b76",
  bing: "AB440C3FC7C9F42B56A6109D1E8D286B",
};

export function siteVerification() {
  const other: Record<string, string> = {};
  if (SITE_VERIFICATION.naver)
    other["naver-site-verification"] = SITE_VERIFICATION.naver;
  if (SITE_VERIFICATION.bing) other["msvalidate.01"] = SITE_VERIFICATION.bing;
  return {
    google:
      SITE_VERIFICATION.google ||
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other,
  };
}
