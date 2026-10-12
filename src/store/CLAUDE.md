# store — zustand 전역 상태

- 파일 하나 = 스토어 하나: `timeline.ts`(선택 연도, 재생 여부), `filters.ts`(지역·카테고리), `ui.ts`(지도 시점, 지도 가운데 경도, 사건 패널 열림, 선택된 사건). 정렬 기준 시점은 `useRankingViewpoint()`.
- 스토어에는 원시 상태와 setter만. 파생값(보여줄 사건 목록 등)은 `lib/`의 순수 함수로 계산한다.
- 컴포넌트에서는 selector로 필요한 값만 구독한다: `useTimeline((s) => s.year)`. 스토어 전체 구독 금지(게이지 드래그 시 리렌더 폭증).
- persist(localStorage)는 쓰지 않는다. 공유 상태는 URL 쿼리로 처리한다. (예외: 테마는 `ThemeToggle`, 언어는 `LanguageSelect`가 직접 저장)
