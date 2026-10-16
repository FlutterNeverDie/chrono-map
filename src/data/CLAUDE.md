# data — 정의와 콘텐츠 진입점

콘텐츠 원본은 `content/`(형식은 content/CLAUDE.md). 이 폴더는 코드에서 쓰는 정의만 둔다.

- `content.ts`: **사건·시점별 순서의 유일한 진입점**(`EVENTS`, `RANKINGS`) — **서버에서만** import. 브라우저 코드는 `contentMeta.ts`(`LAST_YEAR`, 작은 `content-meta.json`)와 `store/events`를 쓴다. `generated/content.json`(생성물, git 제외 — `content/*.txt` + `content/wikipedia.json`을 합친 것)을 감싼다.
- `lands.ts`: 상세 페이지(사건·주제 지도 항목·전쟁) 자리를 다스린 나라의 차례(`landRuns`, `landName`) — **서버에서만**. `generated/lands.json`은 `npm run lands`(scripts/build-lands.ts, dev/build 때 자동)가 `public/borders` 스냅샷과 사건·전쟁(가장 중요한 전투 자리)·주제 지도 항목 좌표로 만든다(열쇠는 상세 페이지 경로, `content`·`wars:build`·`topics:build` 다음, 약 6초. 입력(스크립트·자리 좌표·국경 파일 크기·수정 시각)의 지문이 `generated/lands.stamp`와 같으면 건너뜀). 사건이 바다 위면 30~220km 둘레에서 땅을 찾고, 겹친 층은 괄호 없는 이름 중 가장 좁은 나라를 고른다.
- `regions.ts`: 사건 분류용 지역 12개(id, 색). 이름은 i18n 사전 `regions`.
- `viewpoints.ts`: 지도 시점 8개(id, 가운데 경도, 가까운 지역 순서). 이름은 i18n 사전 `viewpoints`. 버튼 순서는 경도 순으로 자동 정렬(지도 왼쪽 → 오른쪽: 북미, 남미, 서유럽 … 동아시아, 오세아니아).
- `categories.ts`: 사건 카테고리 목록.
- `eras.json`: 시대 정의(게이지 레이블).
- `mapMarkers.ts`: 본 지도 하단 띠·"이 시기의 다른 지도"용 표식. 작은 색인(`campaign-index.json`, `topic-index.json`)만 읽는다 — 지도가 추가되면 자동 반영. `MAP_LANES`(띠 목록), `MAP_MARKERS`, `markersIn(from, to)`.

## 규칙

- 지역·시점·카테고리 목록은 여기 한 곳에만 둔다(언어 목록은 `i18n/locales.ts`). 변환 스크립트(`scripts/build-content.ts`)도 이 파일들을 import해 검증한다.
- 지역·시점을 추가하면: `lib/types.ts`의 유니온 → 이 폴더 정의 → 8개 언어 사전 → `content/events|rankings/<id>.txt` 순서로 고친다(타입 오류가 빠진 곳을 알려준다).
- 지도 위 나라(정치체) 영역은 이 지역과 무관하다(`public/borders`, features/map).
