# content — 사람·AI가 편집하는 데이터 (서버 DB 대신)

이 폴더의 텍스트 파일이 사이트 콘텐츠의 **유일한 원본**이다. 앱 코드는 여기를 직접 읽지 않고,
변환 결과(`src/data/generated/content.json`, `public/borders/`)만 읽는다.

| 파일 | 내용 | 변환 |
| --- | --- | --- |
| `events/<지역id>.txt` | 사건. 파일 이름 = 지역 (korea, china, …) | `npm run content` (dev/build 때 자동) |
| `rankings/<시점id>.txt` | 그 시점에서 중요한 사건 순서 | `npm run content` |
| `polity-names.txt` | 지도 위 나라 이름 수정 | `npm run borders` |

지역 id: korea, china, japan, central-asia, southeast-asia, india, middle-east, europe, africa, north-america, south-america, oceania
시점 id: korea, east-asia, central-asia, west-asia, eastern-europe, western-europe, north-america, south-america, oceania

## 사건 형식 (`events/<지역id>.txt`)

```
@ imjin-war                      ← id: 영문 소문자 kebab-case, 전체에서 유일, 한번 정하면 바꾸지 않음(URL)
when: 1592 ~ 1598                ← 기간. 한 해면 "when: 1592", 기원전은 음수 "when: -221", "-500 ~ -300"
precision: year                  ← (선택) year(기본) | decade | century. year가 아니면 "약 ~"으로 표시
coords: 129.04, 35.1             ← 경도, 위도 (대표 장소)
category: war                    ← war | politics | science | culture | religion | economy | exploration
importance: 5                    ← 1~5, 세계사 전체 기준 중요도
source: https://...              ← 출처, 여러 줄 가능 (필수)
title.ko: 임진왜란                ← 언어별 텍스트: title / place / summary × ko en zh es hi ar fr pt
title.en: Imjin War                 한국어(.ko)는 필수, 나머지는 선택(없으면 영어 → 한국어로 대체)
place.ko: 조선
summary.ko: 도요토미 히데요시가 조선을 침략해 7년간 전쟁이 이어졌다.
```

- 사건 사이는 빈 줄 하나. `#`으로 시작하는 줄은 주석.
- 기간 사건은 선택 연도가 기간 안이면 "진행 중"으로 표시된다. 너무 긴 기간(수백 년 왕조 전체)은 피하고, 건국·멸망처럼 시점이 분명한 사건으로 나눈다.
- 사건의 지역은 **역사적 소속** 기준(예: 콘스탄티노폴리스 함락 = europe). 한 사건은 한 파일에만.
- 큼지막한 사건만 넣는다. 한 지역 파일에 수십~수백 건 수준.

## 시점별 순서 (`rankings/<시점id>.txt`)

```
korea-liberation
imjin-war
hunminjeongeum
```

- 한 줄에 사건 id 하나, 위가 더 중요. 여기 있는 사건이 그 시점의 목록에서 항상 먼저 나온다.
- 없는 사건은 자동 정렬: 시점에서 가까운 지역(data/viewpoints.ts) + importance + 연도 가까움 (`src/lib/ranking.ts`).

## AI가 편집할 때

1. 해당 지역 파일만 연다(파일이 작아야 실수가 적다).
2. 연도·장소는 출처 페이지와 대조한다. 확실하지 않으면 `precision: decade/century`.
3. 편집 후 `npm run content` — 오류는 `파일:줄` 형식으로 나온다. 통과해야 끝.
