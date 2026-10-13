import { DEFAULT_LOCALE, LOCALES } from "./locales";

/**
 * 한국어 경로(`/`, `/event/…`)에 들어왔을 때 알맞은 언어 경로로 보내는 head 스크립트.
 *   1) 전에 고른 언어(localStorage "locale")가 있으면 그 언어
 *   2) 없으면 브라우저 언어 설정(navigator.languages) 중 지원하는 첫 언어, 하나도 없으면 영어
 * 접속 국가(IP)가 아니라 브라우저 언어를 쓴다 — 해외 거주 한국인·여행자에게도 맞고 서버가 필요 없다.
 * 검색 로봇은 보내지 않는다(Googlebot은 영어 브라우저라 `/` 한국어 페이지가 색인에서 빠질 수 있음).
 * 같은 페이지의 그 언어 주소로 보낸다: /event/imjin-war → /en/event/imjin-war
 */
export const localeRedirectScript = `(function(){try{
if(/bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent))return;
var L=${JSON.stringify(LOCALES)},l=localStorage.getItem("locale");
if(L.indexOf(l)<0){l=null;var a=navigator.languages||[navigator.language];
for(var i=0;i<a.length&&!l;i++){var c=String(a[i]||"").toLowerCase().split("-")[0];if(L.indexOf(c)>-1)l=c}
if(!l)l="en"}
if(l!=="${DEFAULT_LOCALE}")location.replace("/"+l+(location.pathname==="/"?"":location.pathname)+location.search+location.hash)
}catch(e){}})()`;
