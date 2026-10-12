# features/ww2 — 2차대전 지도 (/ww2)

본 지도(features/map·events·timeline)와 **코드를 공유하지 않는다**. 공용으로 쓰는 것은 i18n, components/ui, lib/types뿐.
화면 조립은 `src/app/Ww2Screen.tsx`(상단 바 `SiteHeader`는 app 공용).

- `model.ts`: 데이터(src/data/generated/ww2.json)와 순수 함수. 시간 단위는 **월 번호**(연×12 + 월−1).
  `sideOf(나라, 월)`, `battlesIn(월)`, `formatMonth`(Intl.DateTimeFormat, 8개 언어 자동).
- `store.ts`: 이 화면 전용 zustand(선택 월, 선택 전투, 패널 열림). 처음은 1939년 9월.
- `geo.ts`: 투영·해안선·연도별 국경 로더(`/ww2/borders/<연도>.json`, 이름은 공용 `/borders/names/<언어>.json`).
- `Ww2Map.tsx`: 진영 색 영토(해안선으로 자름) + 진행 중 전투 표시. 끌기·휠·두 번 클릭 확대.
- `BattlePanel.tsx`: 그 달의 전투(언어판 수 순), 위키백과 첫 문단 + 링크 + CC BY-SA 4.0.
- `MonthGauge.tsx`: 월 슬라이더(1937-07 ~ 1945-09), 재생(0.7초/월), 연도 눈금.
- `Legend.tsx`: 진영 색 범례. 색은 `globals.css`의 `--ww2-axis/allies/neutral`.
