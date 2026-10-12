# lib — 순수 함수와 타입

- React import 금지. 부수효과 없는 순수 함수만. 브라우저 API(window 등) 사용 금지.
- `types.ts`: 데이터 모양의 단일 출처(`Locale`, `Localized`, `HistoryEvent`, `Rankings`, `RegionId`, `ViewpointId`, `CategoryId`, `Precision`).
- `year.ts`: `formatYear(-221, "ko") → "기원전 221년"`, `("en") → "221 BC"`. 사건의 때는 `formatWhen(event, locale)`(한 해 / 기간 / 약). 언어별 표기는 `FORMATS` 한 곳.
- `localize.ts`: `pick(text, locale)` — 요청 언어 → 영어 → 한국어 순 대체.
- `timeScale.ts`: 게이지 위치값(0~1000) ↔ 연도(비선형), 연도별 표시 범위(`yearWindow`).
- `events.ts`: 사건은 항상 `start`~`end` 기간. `visibleEvents`(선택 연도 ± 범위에 걸치는 사건), `yearDistance`(기간 안이면 0), `isOngoing`(기간 사건 진행 중).
- `ranking.ts`: 시점별 정렬 `rankEvents`. 시점별 순서 데이터(`content/rankings`)가 있으면 그 순서가 우선, 없으면 지역 가까움·importance·연도 가까움 점수. 가중치는 `RANK_WEIGHTS` 한 곳에서만 조정.
- 새 함수에는 경계값(기원전/서기 경계, 범위 끝, 기간 사건)을 고려한다.
