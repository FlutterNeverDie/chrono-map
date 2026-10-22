# features/topic — 주제 지도 (/maps/<id>)

본 지도·전쟁 지도와 **코드를 공유하지 않는다**. 공용은 i18n, lib, components/ui, components/map(뷰포트·국경 로더·WebGL 판·나침반)뿐.
화면 조립은 `src/app/TopicScreen.tsx`. 데이터 작성법은 `content/topics/CLAUDE.md`.

- `types.ts`: Topic·TopicItem·SpreadPoint. 시간값 t = 월 번호(연×12 + 월−1).
- `data.ts`: 생성된 topics.json — **서버(페이지)에서만 import**, 클라이언트에는 그 지도 하나만 props로.
- `logic.ts`: `topicScale`(scale 연도를 같은 간격으로 놓는 비선형 슬라이더), `keyframes`(항목 등장·확산 시점),
  `visibleItems`(span: 기간 안 / persist: 이미 생긴 것), `currentItems`("이 시기"/"최근 등장" 목록), `formatT`·`formatYearShort`(오래전 연도는 "기원전 100만년").
- `store.tsx`: `TopicProvider`(페이지 전용 상태: t, 선택, 패널, 지도 이동 요청). 처음 시점은 `startT`(logic.ts) - 지도에 가장 많이 보이는 때(span: 항목이 가장 많이 겹치는 때, persist: 마지막 키프레임 = 전부, `Topic.start`가 있으면 그것 - 전쟁 목록은 전투가 가장 많은 해 1942년). 예전에는 첫 항목(왼쪽 끝)이라 점 하나만 보였다(사용자 결정 2026-10-22). 주소에 `?item=<id>`가 있으면 그 항목을 고르고 그 시점·위치로 이동해 시작.
- `TopicMap.tsx`: 배경 = 그 해 역사 국경(옅게, 공용 `public/borders`), 항목 점, `spread`가 있으면(span·persist 모두) 발원지→그 시점까지 퍼진 지점 점선.
  항목 이름은 점·나라 이름보다 위 층에 따로 그린다(`labelAt`): 고른 항목 → 중요한 순으로 위·아래·오른쪽·왼쪽 자리를 시도해 다른 이름표나 **점**과 겹치면 다음 자리, 다 막히면 이름 생략. 이름 층은 `direction=ltr`(아랍어에서도 start = 점 오른쪽).
- `TopicMapGl.tsx`(브라우저 기본, 코드는 따로 받음): 같은 그림을 WebGL로(공용 `useGlViewport` + `GlCanvas`) - 본 지도처럼 기울이기·방향 돌리기·나침반(휴대폰 오른쪽 위, 데스크톱 패널 왼쪽 아래). 확산 경로는 점선 직선(1.4px, 4·3), 점·이름은 글자 판(층: 점 → 나라 이름 → 항목 이름), 1.5배 넘게 확대하면 50m 해안선. `TopicMap`이 WebGL2가 없거나 실패하거나 `?svg`면 svg 판을 그린다. 이름표 자리는 둘이 같은 `itemLabelSpots`(logic.ts).
- 항목 안의 작은 점(`Topic.points`, 지금은 전쟁 목록 /wars의 전투 - app/warsTopic): 점이 많아(전투 2600여 개) 페이지에 넣지 않고 언어별 파일(`public/campaigns/points/<언어>.json`, `npm run wars:build`가 만듦 - 이름·때는 그 언어로 미리 적음)을 지도가 따로 받는다(`points.ts`의 `useTopicPoints`). 그 기간이고 그 항목이 보일 때만 항목 색 작은 원(`visiblePoints`). 누르면 그 점과 항목을 고르고(`selectPoint`), 지도에 이름·때, 패널의 그 항목 카드에 이름·때·그 자리로 가는 버튼(`points.link`, `points.label` - 전쟁 지도의 그 전투 `?battle=`). 누르기는 항목 점에 바로 닿았으면 항목, 아니면 가까운 작은 점.
- `TopicPanel.tsx`: "이 시기|최근 등장" / "전체"(고르면 그 시점으로 이동), 글은 3줄까지, 출처는 카드마다 글자(링크 아님) + 목록 끝 `WikiCredit`(라이선스 링크), 문서 링크는 상세 페이지. "자세히 ›"는 바로 상세 페이지로(`CardSummary`) → 항목의 `page`(없으면 `maps/<지도>/<항목>`, 전쟁 목록은 `wars/<id>/about`).
- `TopicTitle.tsx`: 지도 왼쪽 위 제목 상자(지금 시점 · 지도 이름 · 지도에 보이는 항목 수) - 본 지도 `MapTitle`과 같은 모양.
- `TopicGauge.tsx`: 비선형 슬라이더. ◀ ▶는 연도 단위(`store`의 step - 설정 메뉴 `TopicStepSetting`, 본 지도와 같은 공용 `components/ui/YearStepSetting`·저장값 `yearStep`)만큼, 그 안에 바뀌는 게 없으면 다음 키프레임까지 건너뜀(발명 지도는 100만 년 전부터라 빈 시기를 한 단위씩 넘기지 않게). 끌기는 단위와 상관없이 자유.
- `ItemMarks.tsx`: 슬라이더 바로 위 항목 표식(span: 기간 막대를 최대 3줄로 쌓음, persist: 눈금). 중요도 5는 진하게, 지금 보이는 항목은 강조, 누르면 그 항목으로 이동. 자리 계산은 `logic.ts`의 `itemMarks`.
- 상단 탭은 `topic-index.json`으로 자동 생성(`src/app/SiteHeader.tsx`).
- 항목에 `link`가 있으면 패널 카드에 그 지도로 가는 버튼(`topic.linkLabel`)을 붙인다 — 전쟁 지도 첫 화면(/wars)이 이렇게 각 전쟁 지도로 보낸다.
- 항목 제목·설명(`itemTitle`·`itemSummary`): `lib/localize`의 `localizedTitle`·`localizedSummary`(사건·전쟁과 같은 대체 순서). 직접 쓴 summary가 있는 언어의 위키백과 요약은 빌드에서 빠진다(`scripts/lib/wikipedia`의 `withoutOwn`).
- 화면에 넘길 때는 `localizeTopic(주제, 언어)`(data.ts, TopicScreen에서 호출)로 그 언어와 대체 언어만 남긴다(`lib/localize`의 `keepLocales`).
- 색: 항목마다 다른 색(`itemColor`, 9색 팔레트를 시작 순서대로 돌려 씀 → 시기가 가까운 항목끼리 다른 색). 지도 점·확산 경로·목록 카드·슬라이더 표식에 쓴다. 주제 지도 자체 색(`topic.txt`의 color)은 탭·슬라이더 진행 막대·본 지도 띠에만 쓰고, 지도끼리 겹치지 않게 고른다(전쟁 빨강, 역병 보라, 발명 파랑, 종교 초록 `#2f855a` - 주황·호박색은 사이트 강조색 `--accent`라 피한다).
