# lib — 순수 함수와 타입

- React import 금지. 부수효과 없는 순수 함수만. 브라우저 API(window 등) 사용 금지.
- `types.ts`: 데이터 모양의 단일 출처(`Locale`, `LocalizedText`, `WikiPage`, `HistoryEvent`, `Rankings`, `RegionId`, `ViewpointId`, `CategoryId`, `Precision`).
- `period.ts`: **연도 선택 단위**. `periodOf(year)` → 기원전은 세기(-300~-201), 서기는 10년(710~719). `stepPeriod`, `distanceToPeriod`, `periodWindow`(앞뒤로 함께 보여줄 범위), `formatPeriod`(8개 언어: "기원전 3세기", "710년대", "3rd century BC", "710s" …), `formatPeriodRange`("1490–1499년", "300–201 BC").
- `year.ts`: 사건 연도 표기. `formatYear(-221, "ko") → "기원전 221년"`, `formatWhen(event, locale)`(한 해 / 기간 / 약).
- `localize.ts`: `pick(text, locale)`(요청 언어 → 영어 → 한국어), `eventTitle`(직접 쓴 제목 → 위키백과 문서 제목), `eventSummary`(그 언어 위키백과 → 직접 쓴 요약 → 영어 위키백과; `page`가 있으면 출처 표기 필수).
- `timeScale.ts`: 게이지 위치값(0~1000) ↔ 연도(비선형 축). 시작은 기원전 3500년(`MIN_YEAR`, 문명 시작 — 국경 데이터의 첫 국가 수메르 기원전 3400년).
- `events.ts`: `visibleEvents(events, period)`(기간 ± 범위에 걸치는 사건), `isOngoing`(기간 전에 시작해 기간 안까지 이어지는 사건).
- `ranking.ts`: 시점별 정렬 `rankEvents`. 시점별 순서 데이터가 있으면 우선, 없으면 지역 가까움·importance·기간 가까움 점수. 가중치는 `RANK_WEIGHTS` 한 곳.
- 새 함수에는 경계값(기원전/서기 경계, 0년 없음, 범위 끝, 기간 사건)을 고려한다.
