# features/topic — 주제 지도 (/maps/<id>)

본 지도·전쟁 지도와 **코드를 공유하지 않는다**. 공용은 i18n, lib, components/ui, components/map(뷰포트·국경 로더)뿐.
화면 조립은 `src/app/TopicScreen.tsx`. 데이터 작성법은 `content/topics/CLAUDE.md`.

- `types.ts`: Topic·TopicItem·SpreadPoint. 시간값 t = 월 번호(연×12 + 월−1).
- `data.ts`: 생성된 topics.json — **서버(페이지)에서만 import**, 클라이언트에는 그 지도 하나만 props로.
- `logic.ts`: `topicScale`(scale 연도를 같은 간격으로 놓는 비선형 슬라이더), `keyframes`(항목 등장·확산 시점),
  `visibleItems`(span: 기간 안 / persist: 이미 생긴 것), `currentItems`("이 시기"/"최근 등장" 목록), `formatT`·`formatYearShort`(오래전 연도는 "기원전 100만년").
- `store.tsx`: `TopicProvider`(페이지 전용 상태: t, 선택, 패널, 지도 이동 요청). 주소에 `?item=<id>`가 있으면 그 항목을 고르고 그 시점·위치로 이동해 시작.
- `TopicMap.tsx`: 배경 = 그 해 역사 국경(옅게, 공용 `public/borders`), 항목 점, span이면 발원지→확산 지점 점선.
- `TopicPanel.tsx`: "이 시기|최근 등장" / "전체"(고르면 그 시점으로 이동), 글은 접고 "자세히"로 펼침, 위키백과 출처.
- `TopicGauge.tsx`: 비선형 슬라이더, ◀ ▶·재생은 다음 키프레임으로.
- `ItemMarks.tsx`: 슬라이더 바로 위 항목 표식(span: 기간 막대를 최대 3줄로 쌓음, persist: 눈금). 중요도 5는 진하게, 지금 보이는 항목은 강조, 누르면 그 항목으로 이동. 자리 계산은 `logic.ts`의 `itemMarks`.
- 상단 탭은 `topic-index.json`으로 자동 생성(`src/app/SiteHeader.tsx`).
- 항목에 `link`가 있으면 패널 카드에 그 지도로 가는 버튼(`topic.linkLabel`)을 붙인다 — 전쟁 지도 첫 화면(/wars)이 이렇게 각 전쟁 지도로 보낸다.
- 화면에 넘길 때는 `localizeTopic(주제, 언어)`(data.ts, TopicScreen에서 호출)로 그 언어와 대체 언어만 남긴다(`lib/localize`의 `keepLocales`).
