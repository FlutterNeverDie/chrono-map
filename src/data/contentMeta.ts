import meta from "./generated/content-meta.json";

/**
 * 브라우저에서도 쓰는 작은 콘텐츠 값(슬라이더 끝 연도). 사건 데이터(content.ts)는 서버에서만 읽고,
 * 화면에는 그 언어에 필요한 부분만 props로 넘긴다(번들 크기).
 */
export const LAST_YEAR: number = meta.lastYear;
