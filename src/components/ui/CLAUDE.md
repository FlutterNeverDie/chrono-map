# components/ui — 공용 UI

- 도메인(사건, 연도, 지역)을 모르는 순수 UI만 둔다(Button, Chip, BottomSheet 등). 도메인이 들어가면 features로.
- 모든 상호작용 요소는 터치 영역 최소 44×44px, 포커스 링 표시.
- 스타일은 Tailwind, 조건부 클래스는 `clsx`.
- `ThemeToggle`: `<html data-theme>`을 바꾸고 localStorage(`theme`)에 저장한다. 테마 상태는 DOM이 단일 출처(`useSyncExternalStore`로 구독). 기본은 일반(light).
- 이 폴더 컴포넌트는 i18n을 직접 쓰지 않는다. 문구는 props로 받는다(예: `toDarkLabel`).
- 모바일 하단 시트(BottomSheet)는 여기 하나로 통일해 지도·카드·필터가 같이 쓴다.
- `CardSummary`: 지도 카드 설명. 글을 3~4줄로 자르고 아래 줄 왼쪽에 "자세히 ›"(바로 상세 페이지로, 카드 클릭으로 번지지 않음), 오른쪽 끝에 출처 글자 `source`(링크 아님 - 잘못 눌려 위키백과로 넘어가지 않게). 그 자리에서 펼치는 기능은 없앴다 - 상세 페이지(본문 광고)로 많이 가게. 본 지도·전쟁·주제 지도 카드가 같이 쓴다. 문구는 props.
- `Popover`: 누르면 펼쳐지는 작은 메뉴(바깥 누르기·Esc로 닫힘, 닫혀도 내용은 HTML에 있음). 모바일 상단 바의 지도 고르기·시점·설정.
- `WikiCredit`: 지도 목록 끝의 출처 한 줄("설명: 위키백과 · CC BY-SA 4.0" 링크 + 원문 링크는 각 카드 "자세히"에). 카드에는 링크 없는 출처 글자만 둔다(링크였을 때 "자세히" 옆이라 잘못 눌림). 위키백과 로고·W 아이콘은 위키미디어 상표라 쓰지 않는다. 문구는 props.
- `NamesToggle`: 지도 나라 이름 보이기/숨기기. `<html data-names="off">` + localStorage(`names`), 지도 쪽은 이름 묶음 `<g>`에 `map-names` 클래스만 붙이면 globals.css가 숨긴다.
- `ShareButton`: 지금 주소 공유(Web Share, 없으면 복사 후 "복사됨").
