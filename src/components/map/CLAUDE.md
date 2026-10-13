# components/map — 지도 공용 부품 (도메인 모름)

전쟁 지도(features/campaign)·주제 지도(features/topic)가 같이 쓴다. 사건·전쟁·전염병 같은 기능 데이터를 import하지 않는다.
(본 지도 features/map은 시점·확대 상태를 전역 store와 엮어 쓰므로 아직 자체 구현을 쓴다.)

- `useMapViewport(처음 {lon, lat, zoom})`: 메르카토르 투영(**경도 0에서 한 번만** 투영하고 좌우 이동은 `copies` 위치로 translate — 끌 때 도형을 다시 계산하지 않는다. `path(도형)`은 도형 객체마다 캐시. 복사본 `<g>`의 key·clipPath id는 순번으로), 회전·세로 이동·휠/두 번 클릭 확대, `focusTo(좌표, 최소 배율)`,
  지도 위 패널(`data-map-overlay`)에 가리지 않게 가운데를 비켜 잡기. `svgProps(onTap)`을 svg에 펼쳐 넣는다.
- `usePolities(url)`: 정적 국경 TopoJSON 로더(뒤집힌 도형 제거). `loadJson`·`loadPolities`는 최근 24개만 보관하는 캐시(실패하면 빼서 다시 시도), `useSettled(값)`으로 슬라이더가 멈춘 값만 받는다(끄는 동안 요청 폭주 방지). `usePolityNames(locale)`: 언어별 나라 이름.
- `useMainBordersUrl(year)`: 본 지도 국경 스냅샷(public/borders) 중 그 해에 맞는 파일 — 주제 지도의 배경 국경용.
- `polityColor(key)`: 나라별 고정 색.
- `useHydrated()`: 하이드레이션이 끝났는지. 해안선·경위선 경로(`landD`, `graticuleD`)는 하이드레이션 뒤에만 채운다 — 서버 HTML에 넣으면 복사본·clip·외곽선마다 반복돼 페이지가 수백 KB 커진다(같은 데이터가 JS 번들에 이미 있음). 본 지도 WorldMap도 같은 규칙.
- `swallowNextClick()`(ghostClick.ts): 지도 탭(pointerup)으로 패널을 열면 폰이 같은 자리에 click을 한 번 더 보내, 그 사이 펼쳐진 패널 머리줄을 눌러 바로 닫혀 버린다. 탭으로 연 직후 0.5초 안의 click 하나를 버린다 — `useMapViewport`의 onTap과 본 지도 WorldMap이 쓴다. 새로 pointerup에서 무언가를 여는 코드를 만들면 같이 부른다.
