/**
 * 지도에서 탭(손가락을 뗄 때 = pointerup)으로 패널을 열면, 폰은 그 직후 같은 자리에 click을 한 번 더 보낸다.
 * 그 사이 패널이 손가락 자리까지 펼쳐져 있으면 click이 패널 머리줄(열기/닫기 버튼)에 떨어져 바로 닫혀 버린다
 * ("열렸다가 0.1초 만에 꺼짐"). 탭으로 무언가를 연 직후 잠깐 동안 오는 click 하나를 버린다.
 */
export function swallowNextClick(ms = 500) {
  const until = Date.now() + ms;
  const swallow = (e: MouseEvent) => {
    remove();
    if (Date.now() > until) return;
    e.stopPropagation();
    e.preventDefault();
  };
  const remove = () => document.removeEventListener("click", swallow, true);
  document.addEventListener("click", swallow, true);
  setTimeout(remove, ms);
}
