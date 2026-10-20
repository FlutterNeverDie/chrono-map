import Script from "next/script";
import { ADSENSE_CLIENT } from "./config";

/**
 * AdSense 스크립트(사이트 전체에 한 번). 게시자 ID가 없거나 개발 모드면 넣지 않는다.
 * EEA·영국 동의 메시지(CMP)는 AdSense 화면의 "개인 정보 보호 및 메시지"에서 켜면 이 스크립트가 함께 띄운다(코드 추가 없음).
 */
export function AdsScript() {
  if (!ADSENSE_CLIENT || process.env.NODE_ENV !== "production") return null;
  return (
    <Script
      id="adsense"
      // 첫 화면이 다 뜨고 여유가 생긴 뒤에 받는다(휴대폰에서 지도·목록이 먼저 움직이게). 광고는 목록·본문 아래라 늦어도 된다
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
