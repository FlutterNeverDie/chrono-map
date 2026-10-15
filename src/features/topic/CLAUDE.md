# features/topic — 주제 지도 (/maps/<id>)

본 지도·전쟁 지도와 **코드를 공유하지 않는다**. 공용은 i18n, lib, components/ui, components/map(뷰포트·국경 로더)뿐.
화면 조립은 `src/app/TopicScreen.tsx`. 데이터 작성법은 `content/topics/CLAUDE.md`.

- `types.ts`: Topic·TopicItem·SpreadPoint. 시간값 t = 월 번호(연×12 + 월−1).
- `data.ts`: 생성된 topics.json — **서버(페이지)에서만 import**, 클라이언트에는 그 지도 하나만 props로.
- `logic.ts`: `topicScale`(scale 연도를 같은 간격으로 놓는 비선형 슬라이더), `keyframes`(항목 등장·확산 시점),
  `visibleItems`(span: 기간 안 / persist: 이미 생긴 것), `currentItems`("이 시기"/"최근 등장" 목록), `formatT`·`formatYearShort`(오래전 연도는 "기원전 100만년").
- `store.tsx`: `TopicProvider`(페이지 전용 상태: t, 선택, 패널, 지도 이동 요청). 주소에 `?item=<id>`가 있으면 그 항목을 고르고 그 시점·위치로 이동해 시작.
- `TopicMap.tsx`: 배경 = 그 해 역사 국경(옅게, 공용 `public/borders`), 항목 점, `spread`가 있으면(span·persist 모두) 발원지→그 시점까지 퍼진 지점 점선.
  항목 이름은 점·나라 이름보다 위 층에 따로 그린다(`labelAt`): 고른 항목 → 중요한 순으로 위·아래·오른쪽·왼쪽 자리를 시도해 다른 이름표나 **점**과 겹치면 다음 자리, 다 막히면 이름 생략. 이름 층은 `direction=ltr`(아랍어에서도 start = 점 오른쪽).
- `TopicPanel.tsx`: "이 시기|최근 등장" / "전체"(고르면 그 시점으로 이동), 글은 접고 "자세히"로 펼침, 위키백과 출처.
- `TopicGauge.tsx`: 비선형 슬라이더, ◀ ▶·재생은 다음 키프레임으로.
- `ItemMarks.tsx`: 슬라이더 바로 위 항목 표식(span: 기간 막대를 최대 3줄로 쌓음, persist: 눈금). 중요도 5는 진하게, 지금 보이는 항목은 강조, 누르면 그 항목으로 이동. 자리 계산은 `logic.ts`의 `itemMarks`.
- 상단 탭은 `topic-index.json`으로 자동 생성(`src/app/SiteHeader.tsx`).
- 항목에 `link`가 있으면 패널 카드에 그 지도로 가는 버튼(`topic.linkLabel`)을 붙인다 — 전쟁 지도 첫 화면(/wars)이 이렇게 각 전쟁 지도로 보낸다.
- 항목 제목·설명(`itemTitle`·`itemSummary`): `lib/localize`의 `localizedTitle`·`localizedSummary`(사건·전쟁과 같은 대체 순서). 직접 쓴 summary가 있는 언어의 위키백과 요약은 빌드에서 빠진다(`scripts/lib/wikipedia`의 `withoutOwn`).
- 화면에 넘길 때는 `localizeTopic(주제, 언어)`(data.ts, TopicScreen에서 호출)로 그 언어와 대체 언어만 남긴다(`lib/localize`의 `keepLocales`).
- 색: 항목마다 다른 색(`itemColor`, 9색 팔레트를 시작 순서대로 돌려 씀 → 시기가 가까운 항목끼리 다른 색). 지도 점·확산 경로·목록 카드·슬라이더 표식에 쓴다. 주제 지도 자체 색(`topic.txt`의 color)은 탭·슬라이더 진행 막대·본 지도 띠에만 쓰고, 지도끼리 겹치지 않게 고른다(전쟁 빨강, 역병 보라, 발명 파랑, 종교 초록 `#2f855a` - 주황·호박색은 사이트 강조색 `--accent`라 피한다).
