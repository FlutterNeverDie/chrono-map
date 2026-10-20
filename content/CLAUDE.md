# content — 사람·AI가 편집하는 데이터 (서버 DB 대신)

이 폴더의 텍스트 파일이 사이트 콘텐츠의 **유일한 원본**이다. 앱 코드는 여기를 직접 읽지 않고,
변환 결과(`src/data/generated/content.json`, `public/borders/`)만 읽는다.

| 파일 | 내용 | 변환 |
| --- | --- | --- |
| `events/<지역id>.txt` | 사건. 파일 이름 = 지역 (korea, china, …) | `npm run content` (dev/build 때 자동) |
| `rankings/<시점id>.txt` | 그 시점에서 중요한 사건 순서 | `npm run content` |
| `campaigns/<전쟁>/` | 전쟁 지도(/wars) 설정·진영·전투 — `content/campaigns/CLAUDE.md` | `npm run wars:fetch`·`wars:borders`·`wars:build` |
| `topics/<지도>/` | 주제 지도(/maps: 역병·발명·종교 …) 설정·항목 — `content/topics/CLAUDE.md` | `npm run topics:fetch`·`topics:build` |
| `polity-names/<언어>.txt` | 지도 위 나라 이름 수정·보충. 한 줄에 `원본 이름 = 번역` | `npm run borders` |
| `polity-names/wikipedia.txt` | 원본이 엉뚱한 위키 문서(사건·인물·역사 문서)에 이어진 나라의 문서 바꾸기. 한 줄에 `원본 이름 = 영어 위키백과 문서 제목` → 8개 언어 이름이 그 문서에서 온다 | `npm run borders` |
| `threads/posts.en.txt` | 스레드 "오늘의 세계사" 글(사건마다 한 줄: `id | 이미지 큰 글씨 | 작은 글씨 | 본문 첫머리 | 끝 질문`, 직접 쓴 영어 - 위키백과 문장을 옮기지 않는다, 날짜는 쓰지 않음). 사건을 추가하면 한 줄 추가. 이미지 글씨를 바꾸면 `npm run og:fonts` | `npm run threads`, 글 이미지 `/en/event/<id>/post.png` |
| `wikipedia.json` | **자동 생성, 직접 고치지 않음.** 사건별 위키백과 요약(8개 언어) | `npm run wiki`로 받음 → `npm run content`가 합침 |

지역 id: korea, china, japan, central-asia, southeast-asia, india, middle-east, europe, africa, north-america, south-america, oceania
시점 id: korea, east-asia, central-asia, west-asia, eastern-europe, western-europe, north-america, south-america, oceania

## 사건 형식 (`events/<지역id>.txt`)

```
@ imjin-war                      ← id: 영문 소문자 kebab-case, 전체에서 유일, 한번 정하면 바꾸지 않음(URL)
wikipedia: Imjin War             ← 영어 위키백과 문서 제목. 설명·출처는 이 문서(8개 언어)에서 자동으로 온다
when: 1592 ~ 1598                ← 기간. 한 해면 "when: 1592", 기원전은 음수 "when: -221", "-500 ~ -300"
precision: year                  ← (선택) year(기본) | decade | century. year가 아니면 "약 ~"으로 표시
coords: 129.04, 35.1             ← 경도, 위도 (대표 장소)
category: war                    ← war | politics | science | culture | religion | economy | exploration
importance: 5                    ← 1~5, 세계사 전체 기준 중요도
title.ko: 임진왜란                ← (선택) 사건다운 제목. 없으면 그 언어 위키백과 문서 제목
place.ko: 조선                   ← (선택) 장소 이름
summary.ko: ...                  ← (선택) 그 언어 위키백과 문서가 없을 때만 쓰이는 대체 설명
source: https://...              ← (선택) 위키백과 외 추가 출처
```

- 사건 사이는 빈 줄 하나. `#`으로 시작하는 줄은 주석.
- 텍스트 키는 `title / place / summary` × `ko en zh es hi ar fr pt`. 없는 언어는 영어 → 한국어 순으로 대체.
- `wikipedia:`가 없으면 `title.ko`, `summary.ko`, `source`가 필수.
- 설명 우선순위: 그 언어 위키백과 첫 문단 → 직접 쓴 summary → 영어 위키백과. 위키백과 글은 가공하지 않고 그대로 보여주며, 화면에 문서 링크 + CC BY-SA 4.0을 표기한다.
- 사건의 `wikipedia:`가 전쟁 지도(`content/campaigns/<id>/theme.txt`)의 `wikipedia:`와 같으면 사건 카드·상세에 "전쟁 지도로 보기" 버튼이 자동으로 붙는다.
- 새 사건에 `wikipedia:`를 넣었으면 `npm run wiki`(새 문서만 받음, 전부 다시는 `-- --all`) 후 `npm run content`.
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

## 표기 원칙 (나라마다 입장이 다른 내용)

1. **대한민국 관련 영토·명칭은 대한민국 입장을 따른다.** 독도는 대한민국 영토, 바다 이름은 동해(영어 East Sea).
   직접 쓰는 제목·장소·나라 이름(`polity-names/`)에 적용한다.
2. 그 밖의 분쟁·논쟁 사안은 각 언어 위키백과의 표기를 그대로 따른다(설명은 위키백과 원문이므로 가공하지 않는다).
3. 직접 쓰는 문구에서 분쟁 중인 지명은 한쪽 입장만 단정하지 말고 병기한다(1번 제외).
4. 원칙과 맞지 않는 위키백과 문서는 다른 문서로 연결하거나, 그 사건만 `summary`를 직접 써서 대체한다.

## AI가 편집할 때

1. 해당 지역 파일만 연다(파일이 작아야 실수가 적다).
2. 사건마다 영어 위키백과 문서를 먼저 찾아 `wikipedia:`로 연결한다(사건 자체 문서가 가장 좋고, 없으면 가장 가까운 문서).
3. 연도·좌표는 그 문서와 대조한다. 확실하지 않으면 `precision: decade/century`.
4. `npm run wiki` → `npm run content` — 오류는 `파일:줄` 형식으로 나온다. 통과해야 끝.
- 지도 나라 이름이 틀리면 먼저 원인을 본다: 원본이 엉뚱한 문서에 이어져 **모든 언어에서** 틀리면(예: Qarlugs → "Mongol invasion of Central Asia") `polity-names/wikipedia.txt`에서 문서를 바꾸고, 알맞은 문서가 없거나 한 언어만 어색하면 `<언어>.txt`에 직접 적는다(언어별 파일이 우선). `X`에 적은 이름은 `(X)`에도 적용된다. 연도에 따라 나라가 바뀌거나 도형이 틀린 것(1962년 이후 프랑스에 붙은 알제리 등)은 `scripts/lib/polityFixes.mjs`의 `POLITY_FIXES`(본 지도·전쟁 지도 공통, `npm run borders` + `npm run wars:borders`). 여기서 원본 이름(`n`)을 바꾸거나 새 나라를 만들면 전쟁 지도 진영(`campaigns/<id>/sides.txt`)도 새 이름으로 고친다(예: 1801년 이후 `United Kingdom`).
- 시대·민족 이름이 나라 이름표로 나오면 그때의 나라로 적는다(헤이안 시대 등 → 일본, Serbs → 세르비아). 그때의 정치체가 분명하지 않으면 그대로 두거나 설명하는 이름으로(Mexicans → 멕시코 독립군, Palestinians(1948)는 그대로).
- 지도 나라 이름: 서로 다른 나라가 같은 이름으로 번역되면(동·서 분열 — 동돌궐/서돌궐, 같은 한자음 — 진(晉)/진(秦)) `content/polity-names/<언어>.txt`에서 구분해 준다. 원본이 같은 땅을 여러 층("X"·"(X)"·"(상위 제국)")으로 겹쳐 둔 것은 화면에서 이름표를 하나만 단다(`components/map`의 `labelCandidates`).
