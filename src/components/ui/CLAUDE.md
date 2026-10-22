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
- `HideToggle`(`flag` names | pins, `useHidden(flag)`): 지도에서 무엇을 숨기는 스위치 한 줄(오른쪽 끝 스위치, 켜면 숨김). `<html data-<flag>="off">` + localStorage(`<flag>`), 첫 그림 전에 RootDocument 스크립트가 되살림. 나라 이름은 이름 묶음 `<g>`에 `map-names` 클래스(globals.css가 숨김)·WebGL은 속성을 읽음, 사건 핀은 본 지도 WorldMap이 핀 목록을 비움(핀·+N·누르기·말풍선). 영상 캡처(RMW clean.mjs)도 이 속성을 직접 넣는다.
- `ShareButton`: 지금 주소 공유(Web Share, 없으면 복사 후 체크 표시) - 설정 메뉴 맨 아래 줄(소개·개인정보처리방침) 오른쪽 끝 아이콘 버튼.
- `YearStepSetting`: 연도 단위 한 줄(제목 + 오른쪽 끝 고르기 상자, 겹친 투명 `<select>`) - 본 지도·주제 지도 공용, 저장값 `yearStep`(`loadYearStep`).
- `YoutubeButton`: 지도 나침반 옆 둥근 유튜브 버튼(주소·문구는 넘겨받음).
- `Popover`: 열 때마다 내용을 새로 만든다(접었다 펴는 칸이 늘 접힌 채로), 높이는 화면 안으로(넘치면 안에서 스크롤).
