# components/ui — 공용 UI

- 도메인(사건, 연도, 지역)을 모르는 순수 UI만 둔다(Button, Chip, BottomSheet 등). 도메인이 들어가면 features로.
- 모든 상호작용 요소는 터치 영역 최소 44×44px, 포커스 링 표시.
- 스타일은 Tailwind, 조건부 클래스는 `clsx`.
- `ThemeToggle`: `<html data-theme>`을 바꾸고 localStorage(`theme`)에 저장한다. 테마 상태는 DOM이 단일 출처(`useSyncExternalStore`로 구독). 기본은 일반(light).
- 이 폴더 컴포넌트는 i18n을 직접 쓰지 않는다. 문구는 props로 받는다(예: `toDarkLabel`).
- 모바일 하단 시트(BottomSheet)는 여기 하나로 통일해 지도·카드·필터가 같이 쓴다.
- `ExpandableText`: 긴 글을 몇 줄로 접고 "펼치기/접기"로 그 자리에서 펼친다(실제로 잘릴 때만 버튼 표시). 문구는 props. `expanded`는 펼친 뒤(또는 글이 짧아 다 보일 때)에만 본문 아래에 나온다 - 사건 카드의 "이 사건 페이지로".
- `Popover`: 누르면 펼쳐지는 작은 메뉴(바깥 누르기·Esc로 닫힘, 닫혀도 내용은 HTML에 있음). 모바일 상단 바의 지도 고르기·시점·설정.
- `WikiLink`: 카드 오른쪽 끝의 "위키백과 · CC BY-SA 4.0 ↗" 글자 링크(원문 링크 + 라이선스 표기). 위키백과 로고·W 아이콘은 위키미디어 상표라 쓰지 않는다. `ExpandableText`의 `trailing`에 넣어 "펼치기"와 같은 줄 양끝에 둔다.
- `NamesToggle`: 지도 나라 이름 보이기/숨기기. `<html data-names="off">` + localStorage(`names`), 지도 쪽은 이름 묶음 `<g>`에 `map-names` 클래스만 붙이면 globals.css가 숨긴다.
- `PageLink`: 지도 카드에서 상세 페이지로 가는 "○○ 페이지로 ›"(ExpandableText의 `expanded`, 카드 클릭으로 번지지 않음). 본 지도·전쟁·주제 지도 카드가 같이 쓴다.
- `ShareButton`: 지금 주소 공유(Web Share, 없으면 복사 후 "복사됨").
