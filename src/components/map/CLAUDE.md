# components/map — 지도 공용 부품 (도메인 모름)

전쟁 지도(features/campaign)·주제 지도(features/topic)가 같이 쓴다. 사건·전쟁·전염병 같은 기능 데이터를 import하지 않는다.
(본 지도 features/map은 시점·확대 상태를 전역 store와 엮어 쓰므로 아직 자체 구현을 쓴다.)

- `useMapViewport(처음 {lon, lat, zoom})`: 메르카토르 투영(**경도 0에서 한 번만** 투영하고 좌우 이동은 `copies` 위치로 translate — 끌 때 도형을 다시 계산하지 않는다. `path(도형)`은 도형 객체마다 캐시. 복사본 `<g>`의 key·clipPath id는 순번으로), 회전·세로 이동·확대(휠, 두 손가락 핀치, 두 번 클릭·손가락 두 번 탭, 배율 1~16), `focusTo(좌표, 최소 배율)`,
  지도 위 패널(`data-map-overlay`)에 가리지 않게 가운데를 비켜 잡기. `svgProps(onTap)`을 svg에 펼쳐 넣는다.
  배율이 바뀌는 동안(핀치·휠·`focusTo`)은 미리보기: 새 값을 `pending`에만 두고 svg를 CSS transform으로 늘리고 옮긴 뒤, 손을 떼거나(핀치)·0.15초 멈추거나(휠)·이동이 끝나면 한 번 그린다(본 지도 WorldMap과 같은 방식, 전쟁 지도 핀치 38fps → 73fps). svg 부모가 지도 칸 전체를 덮어야 한다(크기를 부모로 잰다). 크기는 미리보기 시작 때 한 번만 재고(`previewRect`), 변환 쓰기는 프레임마다 한 번(`previewFrame`).
- `mapFrame(svg)`(mapCover.ts): 크기를 재는 지도 칸 - `data-map-frame`이 있으면 그것(본 지도: svg를 담은 판을 기울이고 svg에 미리보기 변환을 걸어서), 없으면 svg 부모.
- `mapCover(svg)`·`useMapCover(svgRef)`(mapCover.ts): 지도를 덮은 높이 - 아래(모바일 시트 `data-map-overlay`)와 위(`data-map-top`: 본 지도 제목 상자, 전쟁 지도 상단 바). 세로 이동 한계를 이만큼 늘려(남쪽 끝 희망봉, 북쪽 끝 핀란드 …도 가리지 않은 곳으로) 고른 점을 위아래 가리지 않은 영역의 가운데에 둔다. 본 지도 WorldMap도 같이 쓴다. 지도 위에 새로 위쪽에 떠 있는 것을 만들면 `data-map-top`을 붙인다.
- `rasterizeSvg(svg, 범위, 크기, 손질)`(snapshot.ts): svg를 canvas 한 장으로 굽는다(CSS 변수는 지금 테마 값으로 바꿔 넣음). 본 지도 WorldMap이 확대·끌기 미리보기에 쓴다.
- `usePolities(url)`: 정적 국경 TopoJSON 로더(뒤집힌 도형 제거). `loadJson`·`loadPolities`는 최근 24개만 보관하는 캐시(실패하면 빼서 다시 시도), `useSettled(값)`으로 슬라이더가 멈춘 값만 받는다(끄는 동안 요청 폭주 방지). `usePolityNames(locale)`: 언어별 나라 이름.
- `useMainBordersUrl(year)`: 본 지도 국경 스냅샷(public/borders) 중 그 해에 맞는 파일 — 주제 지도의 배경 국경용.
- `polityColor(key)`: 나라별 고정 색.
- `useHydrated()`: 하이드레이션이 끝났는지. 해안선·경위선 경로(`landD`, `graticuleD`)는 하이드레이션 뒤에만 채운다 — 서버 HTML에 넣으면 복사본·clip·외곽선마다 반복돼 페이지가 수백 KB 커진다(같은 데이터가 JS 번들에 이미 있음). 본 지도 WorldMap도 같은 규칙.
- `swallowNextClick()`(ghostClick.ts): 지도 탭(pointerup)으로 패널을 열면 폰이 같은 자리에 click을 한 번 더 보내, 그 사이 펼쳐진 패널 머리줄을 눌러 바로 닫혀 버린다. 탭으로 연 직후 0.5초 안의 click 하나를 버린다 — `useMapViewport`의 onTap과 본 지도 WorldMap이 쓴다. 새로 pointerup에서 무언가를 여는 코드를 만들면 같이 부른다.
