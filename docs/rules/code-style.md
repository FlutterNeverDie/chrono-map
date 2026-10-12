# 코드·디자인 규칙

## 코드
- TypeScript strict, `any` 금지(타입 정의가 맞지 않는 외부 라이브러리 구간만 주석과 함께 예외).
- 컴포넌트는 기본 서버 컴포넌트, 상태·이벤트가 필요한 것만 `"use client"`. 파일명: 컴포넌트 `PascalCase.tsx`, 그 외 `camelCase.ts`.
- 화면 문구는 i18n 사전(`useI18n().messages`)에서만. 새 문구는 8개 언어 사전에 모두 추가(빠지면 타입 오류).
- 연도는 `lib/year.ts`(`formatYear`), 사건 텍스트는 `lib/localize.ts`(`pick`·`eventTitle`·`eventSummary`)로 표시.
- RTL 대응: 여백·위치는 논리 속성(`ms-/me-/ps-/pe-/start-/end-`).
- 주석은 한국어로 "왜"를 쓴다.

## 디자인
- 이모지 금지. 아이콘은 `components/ui/icons.tsx`의 선 아이콘만.
- 장식(그림자·그라데이션·큰 알약 모양)은 최소로. 테두리 1px + `rounded-md/lg`.
- 색은 Tailwind 테마 색(`bg-surface`, `border-line`, `text-muted`, `bg-chip`, `text-accent`)이나 CSS 변수. 색만으로 구분하지 않는다(라벨 병행).
- 크기(글자가 작다는 피드백이 있었다 — 줄이지 않는다):
  - 본문 16px 이상, 큰 화면 패널 본문 18~19px, 카드 제목 24~26px, 보조 글자 14px 이상.
  - 지도 위 버튼·하단 바 버튼 48px(`size-12`/`h-12`).
- 긴 글은 `components/ui/ExpandableText`로 접고 "자세히"로 그 자리에서 펼친다(페이지 이동 없이).
