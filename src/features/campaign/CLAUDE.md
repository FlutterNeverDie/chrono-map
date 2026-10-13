# features/campaign — 전쟁 지도 (/wars/<id>)

첫 화면 `/wars`(모든 전쟁이 보이는 지도)는 주제 지도 화면을 재사용한다 — `src/app/warsTopic.ts`가 전쟁 목록을 주제 지도 데이터로 바꾼다.

본 지도(features/map·events·timeline)와 **코드를 공유하지 않는다**. 공용은 i18n, components/ui, lib(types·year·localize)뿐.
화면 조립은 `src/app/CampaignScreen.tsx`(상단 바 `SiteHeader`는 app 공용). 데이터 작성법은 `content/campaigns/CLAUDE.md`.

- `types.ts`: Campaign·Battle·SideRule. 시간값 t는 unit이 month면 월 번호(연×12+월−1), year면 연도.
- `data.ts`: 생성된 campaigns.json — **서버(페이지)에서만 import**. 클라이언트에는 그 페이지의 전쟁 하나만 props로 넘긴다(번들 크기).
- `logic.ts`: 순수 함수 — `sideOf`, `battlesAt`(연 단위면 앞뒤 1년 포함), `formatTime`(월은 Intl, 연은 lib/year), `tickYears`.
- `store.tsx`: `CampaignProvider`(전쟁 데이터 + 페이지 전용 zustand 상태: 시점 t, 선택 전투, 패널, 지도 이동 요청).
- `CampaignMap.tsx`: 진영 색(진영 없으면 나라별 색) 영토, 해안선으로 자름, 전투 표시, 끌기·휠·두 번 클릭 확대, 전투 목록에서 고르면 그 전투로 이동(패널에 가리지 않게).
- `BattlePanel.tsx`: "이 시기"(슬라이더 시점의 전투, 중요한 순 + 맨 위 전쟁 요약) / "전체 전투"(전쟁 전체 시간 순, 고르면 슬라이더도 그 시점으로). 글은 접어 두고 "자세히"로 그 자리에서 펼침. 위키백과 링크 + CC BY-SA 4.0.
- `TimeGauge.tsx`: 기간 슬라이더 + 재생. `Legend.tsx`: 전쟁 이름 + 진영 범례.
- `meta.ts`: 페이지 메타데이터(서버) — 각 전쟁 `campaignMetadata`, 첫 화면 `warsMetadata`.
- 진영 색은 `globals.css`의 `--side-a`(빨강) `--side-b`(파랑) `--side-n`(기타).
- 화면에 넘길 때는 `localizeCampaign(전쟁, 언어)`(data.ts, CampaignScreen에서 호출)로 그 언어와 영어 위키백과 요약만 남긴다. 전투마다 8개 언어가 붙어 있어 그대로 넘기면 페이지가 2MB를 넘는다.
