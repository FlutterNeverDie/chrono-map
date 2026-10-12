# features/events — 사건 목록 (F-05, F-06)

## 책임
- `EventPanel`: 지도 위에 떠 있는 사건 목록 틀. 모바일은 게이지 위 접이식 시트(최대 55dvh), `lg:` 이상은 오른쪽 패널(`w-[26rem]`, `xl:` 30rem).
- `EventList`: 선택 연도에 걸치는 사건을 **현재 시점 기준 중요한 순서**로 나열(`useRankedEvents`).

## 규칙
- 정렬·필터 로직은 `lib/events.ts`, `lib/ranking.ts`에만. 이 모듈은 결과를 그리기만 한다.
- 정렬 기준 시점은 `useRankingViewpoint()`(선택된 시점, 지도를 끌었으면 가운데와 가장 가까운 시점).
- 카드: 지역(색 점 + 이름) · 때(`formatWhen`) · 진행 중 배지 · 제목(text-lg 굵게) · 요약(15px) · 장소. 본문 글자는 14px 미만으로 줄이지 않는다.
- 텍스트는 `pick(text, locale)`, 문구는 i18n 사전.
- 지도 핀을 탭하면 패널이 열리고 해당 카드로 스크롤·강조(`id="event-<사건id>"`). 카드를 탭해도 선택된다.
- 상세는 나중에 `/event/[slug]`(언어별) 페이지로 만든다.
