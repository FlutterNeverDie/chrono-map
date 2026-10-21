/**
 * WebGL 지도를 쓸지(브라우저에서만). WebGL2가 없거나, 한 번 만들다 실패했거나(markGlFailed), 주소에 ?svg(비교·확인용)면 svg 지도.
 * 본 지도·주제 지도·전쟁 지도가 같이 쓴다(본 지도는 영상 장면 ?scene도 svg - features/map이 따로 본다)
 */
let failed = false;
let webgl2: boolean | null = null;
export function glAvailable(): boolean {
  if (typeof location === "undefined" || failed) return false;
  if (new URLSearchParams(location.search).has("svg")) return false;
  if (webgl2 === null) {
    try {
      webgl2 = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}
export function markGlFailed() {
  failed = true;
}
