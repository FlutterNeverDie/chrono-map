# features/map — 세계 지도 (F-04)

## 책임

- 화면 전체 평면 지도, 선택 연도의 역사 국경, 사건 핀, 시점 바(`ViewpointBar`), 국경 데이터 출처 표기(`Attribution`).

## 지도

- 투영: **평면 메르카토르**(`geoMercator`), 위도 82°N ~ 58°S, 지도 좌표계 `1000 × MAP_HEIGHT`. `baseMap.ts`의 `makeProjection(centerLon)`만 쓴다.
- 크기: 배율 1에서 세로(위도 전체)를 화면 높이에 맞추고, 가로는 화면 비율만큼 보여준다(ResizeObserver로 viewBox 계산). 화면이 360°보다 넓으면 좌우에 지도를 이어 붙인다. 지도는 하단 바 위 영역(`bottom: var(--bar-h)`)에만 그린다.
- 확대(배율 1~16, `useUi.zoom`): 휠(커서 위치 고정), 두 손가락 핀치, 두 번 클릭·손가락 두 번 탭(iOS는 dblclick이 안 올 때가 있어 onPointerUp에서 직접 판정, 뒤따르는 dblclick은 무시)(+/− 버튼은 없앰 — 지도를 가려서). 가로 이동은 회전(lon), 세로 이동은 확대했을 때만(centerY).
- 확대해도 핀·글자·국경선은 화면에서 거의 같은 크기(핀·글자는 ÷배율, 선은 `vector-effect: non-scaling-stroke`). 확대할수록 작은 나라 이름도 표시.
- 나라를 누르면 강조(진하게 + 테두리)하고 이름을 항상 표시. 다시 누르면 해제.
- 바탕: `world-atlas/land-110m.json` 해안선(현대). 그 위에 연도별 국경.
- 시점: `data/viewpoints.ts`의 9개 경도. 시점이 바뀌면 600ms 동안 가까운 방향으로 회전, 끝나면 `centerLon` 저장.
- 끌기: 좌우로 끌면 경도가 바뀐다(끝없이 이어짐). 끌기 시작하면 시점 선택 해제(null), 끝나면 `centerLon` 저장. 5px 미만은 핀 탭.
- 성능: 투영은 경도 0에서 한 번만 하고 회전은 지도 그룹 translate로(메르카토르에서 경도 회전 = 가로 이동). 지도 내용(`layer`)은 useMemo로 한 번 만들어 복사본마다 재사용 → 끄는 동안 국경 경로를 다시 계산하지 않는다. 핀은 중요한 순 최대 `MAX_PINS`(60, `lib/events.ts`의 `limitPins`).
- 좌표 반올림(`geoPath().digits(1)`, `project()` 소수 1자리) — 서버/브라우저 부동소수점 차이로 하이드레이션 경고가 나기 때문.

## 역사 국경 (`borders.ts`)

- 데이터: `public/borders/<연도>.json`(TopoJSON, 스냅샷 222개), `index.json`(연도 목록), `names/<언어>.json`(원본 이름 → 언어별 이름).
- 생성: `npm run borders`(scripts/build-borders.mjs). 원본 Cliopatria(Seshat), **CC BY 4.0 → 화면에 출처 표기(`Attribution`) 필수**.
- 선택 연도 이하에서 가장 가까운 스냅샷을 쓴다. 슬라이더가 멈춘 연도(0.15초)만 받고, 캐시는 공용 로더(components/map, 최근 24개)를 쓴다. 받는 동안은 이전 지도를 유지.
- 이름표 열쇠는 원본 이름(`n`). 이름은 영어 위키백과 문서 → Wikidata 항목 → 언어별 이름표(없으면 그 언어 위키백과 제목) 순서로 찾는다. 원본의 Wikidata ID는 틀린 경우가 많아 마지막 수단(예: Byzantine Empire → "비잔티움 제국의 대외 관계").
- 틀리거나 빠진 이름은 `content/polity-names/<언어>.txt`에서 고친다(`원본 이름 = 번역`). 원본이 엉뚱한 문서에 이어져 모든 언어에서 틀린 것은 `content/polity-names/wikipedia.txt`(`원본 이름 = 영어 위키백과 문서`)로 문서를 바꾼다. `X`에 적은 이름은 `(X)`에도 적용되고, Wikidata 이름 끝의 연도 괄호 "(1616-1636)"는 뗀다. 이름이 없는 언어는 화면에서 영어 이름으로 대신한다.
- 원본 도형·연도 오류는 변환 때 `POLITY_FIXES`(scripts/lib/polityFixes.mjs, 본 지도 `npm run borders`와 전쟁 지도 `npm run wars:borders`가 같이 씀)로 고친다: 연도별 이름 바꾸기(Great Britain → United Kingdom 1801~, Mali Federation → Mali 1961~, 1954년 전 Netherlands Antilles → Curaçao and Dependencies), 독립한 땅 떼어 내기(알제리·지부티 ← 프랑스, 아덴·무스카트 오만·휴전국가(→ 아랍에미리트)·카타르·바레인·쿠웨이트·키프로스·몰타 ← 영국, 네덜란드령 수리남 ← 네덜란드령 안틸레스, 카빈다), 이름표 위치 고정(영국·프랑스·포르투갈 본토, 아덴), 이름표 빼기(`(Commonwealth of Nations)`, 1969년 이후 `(British Empire)`).
  - 떼어 내기는 `box`(중심이 상자 안인 조각을 통째로)와 `clip`(경위도 다각형으로 실제로 자르기, mapshaper `-clip`/`-erase`) 두 가지. 1956~1968년 원본 영국 도형은 아덴·오만·휴전국가가 한 조각이라 `clip`으로 자른다(경계 꼭짓점은 원본 1954년 도형에서).
  - 연도는 소수(1962.5 = 1962년 7월)도 된다. 본 지도·전쟁 지도 모두 그 스냅샷이 화면에 쓰이는 마지막 시점(본 지도는 다음 스냅샷 직전, 전쟁 지도는 마지막 달) 기준으로 적용한다 → 1962-03에 끝나는 알제리 전쟁 지도는 1962년도 프랑스령 알제리.
  - 원본 이름(`n`)이 바뀌면 전쟁 지도 진영(`content/campaigns/<id>/sides.txt`)도 새 이름으로 적는다.
- 변환 때 작은 조각(약 40km² 미만)은 빼고, 압축 후 뒤집힌 도형(넓이 > 반구)이 있으면 실패한다. 화면에서도 같은 검사로 걸러낸다(725~800년 지도 전체가 칠해지던 버그).
- 색은 정치체마다 고정(해시). 이름은 면적 20만 km² 이상, 큰 순서로 최대 90개(`MAX_LABELS`, 배율만큼 늘어남, 조각 수가 아니라 이름 수로 셈), 핀보다 위에(터치는 통과). 나라가 30개 이하인 시대(고대 초기)는 크기와 상관없이 모두 표시.
- 이름 겹침 방지: 큰 나라부터 놓고, 겹치면 위아래로 비켜 보고, 그래도 자리가 없으면 뺀다(선택한 나라·고대 초기는 항상 표시).

## 색·테마

- CSS 변수(`--map-ocean`, `--map-land`, `--map-border`, `--map-region-opacity`, `--map-label` 등)만 사용. SVG 속성에서 `var()`가 안 먹는 경우(fillOpacity)는 `style`로.

## 모바일 규칙

- 핀은 보이는 점 r=4, 터치 영역 r=16.
- 핀 탭 → `useUi.selectEvent(id)` → 사건 패널이 열리고 해당 카드로 스크롤(hover 툴팁 금지).
- 시점 고르기 화면(시점 바)은 없앴다 — 지도를 끌어 옮긴다. 시점은 처음 화면(언어별 - `data/viewpoints.ts`의 `homeViewpoint`: ko·zh 동아시아, en 북아메리카, es·pt 남아메리카, fr 서유럽, hi 중앙아시아, ar 서아시아)과 사건 목록 정렬(지도 가운데와 가까운 시점의 지역부터)에만 쓰인다.
