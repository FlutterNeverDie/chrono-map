# components/map — 지도 공용 부품 (도메인 모름)

전쟁 지도(features/campaign)·주제 지도(features/topic)가 같이 쓴다. 사건·전쟁·전염병 같은 기능 데이터를 import하지 않는다.
(본 지도 features/map은 시점·확대 상태를 전역 store와 엮어 쓰므로 아직 자체 구현을 쓴다.)

- `useMapViewport(처음 {lon, lat, zoom})`: 메르카토르 투영, 회전·세로 이동·휠/두 번 클릭 확대, `focusTo(좌표, 최소 배율)`,
  지도 위 패널(`data-map-overlay`)에 가리지 않게 가운데를 비켜 잡기. `svgProps(onTap)`을 svg에 펼쳐 넣는다.
- `usePolities(url)`: 정적 국경 TopoJSON 로더(캐시, 뒤집힌 도형 제거). `usePolityNames(locale)`: 언어별 나라 이름.
- `useMainBordersUrl(year)`: 본 지도 국경 스냅샷(public/borders) 중 그 해에 맞는 파일 — 주제 지도의 배경 국경용.
- `polityColor(key)`: 나라별 고정 색.
