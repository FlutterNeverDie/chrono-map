# components/ui — 공용 UI

- 도메인(사건, 연도, 지역)을 모르는 순수 UI만 둔다(Button, Chip, BottomSheet 등). 도메인이 들어가면 features로.
- 모든 상호작용 요소는 터치 영역 최소 44×44px, 포커스 링 표시.
- 스타일은 Tailwind, 조건부 클래스는 `clsx`.
- `ThemeToggle`: `<html data-theme>`을 바꾸고 localStorage(`theme`)에 저장한다. 테마 상태는 DOM이 단일 출처(`useSyncExternalStore`로 구독). 기본은 일반(light).
- 이 폴더 컴포넌트는 i18n을 직접 쓰지 않는다. 문구는 props로 받는다(예: `toDarkLabel`).
- 모바일 하단 시트(BottomSheet)는 여기 하나로 통일해 지도·카드·필터가 같이 쓴다.
- `ExpandableText`: 긴 글을 몇 줄로 접고 "자세히/접기"로 그 자리에서 펼친다(실제로 잘릴 때만 버튼 표시). 문구는 props.
- `Popover`: 누르면 펼쳐지는 작은 메뉴(바깥 누르기·Esc로 닫힘, 닫혀도 내용은 HTML에 있음). 모바일 상단 바의 지도 고르기·시점·설정.
