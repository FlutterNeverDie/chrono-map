# lib — 순수 함수

- React import 금지. 부수효과 없는 순수 함수만. 브라우저 API(window 등) 사용 금지.
- `year.ts`: `formatYear(-221) → "기원전 221년"`, `formatYearRange()`. 연도 표시는 반드시 여기를 거친다.
- `timeScale.ts`: 게이지 위치값(0~1000) ↔ 연도 변환(비선형). 구간 정의의 단일 출처.
- `events.ts`: 선택 연도·필터 → 보여줄 사건 목록 계산.
- `types.ts`: 공용 타입(`HistoryEvent`, `ContinentId`, `CategoryId`).
- 새 함수에는 경계값(기원전/서기 경계, 범위 끝)을 고려한다.
