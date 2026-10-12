# content/campaigns — 전쟁 지도 데이터 (/wars/<id>)

전쟁 하나 = 폴더 하나(`content/campaigns/<id>/`). 크로노맵 본 데이터(content/events)와 별개다.
새 전쟁을 추가하려면 폴더를 만들고 `theme.txt`·`sides.txt`를 쓴 뒤:

```bash
npm run wars:fetch -- <id>     # Wikidata에서 battles.txt 생성 + 위키백과 요약(8개 언어) 받기 (결과는 파일로 캐시)
npm run wars:borders -- <id>   # public/campaigns/<id>/borders/<연도>.json (원본 Cliopatria, 먼저 npm run borders 필요)
npm run wars:build             # src/data/generated/campaigns.json (dev/build 때 자동)
```

| 파일 | 내용 |
| --- | --- |
| `theme.txt` | 전쟁 설정 (아래) |
| `sides.txt` | 나라별 진영 a / b / n(기타)과 기간 |
| `battles.txt` | 전투 목록. 처음엔 자동 생성, 직접 고쳐도 됨(`--list`로 다시 만들면 덮어씀) |
| `extra-battles.txt` | 직접 추가한 전투(자동 생성이 덮어쓰지 않음). Wikidata에 날짜·좌표가 없어 빠진 전투를 여기에 (예: 임진왜란 부산포·당항포 해전) |
| `wikipedia.json` | **자동 생성, 직접 고치지 않음.** 전쟁·전투의 위키백과 요약 캐시 |

## theme.txt

```
wikipedia: Imjin War              ← 전쟁 자체의 영어 위키백과 문서 (제목·설명이 여기서 옴, 같은 문서의 사건과 자동 연결)
region: korea                     ← data/regions의 지역 id 또는 world (목록 페이지 분류)
when: 1592-04 ~ 1598-12           ← 기간. unit이 month면 YYYY-MM, year면 YYYY(기원전은 음수)
unit: month                       ← 슬라이더 단위: month | year (수십 년 넘는 전쟁은 year)
borders-step: 1                   ← 국경 스냅샷 간격(년). 길수록 파일이 적다
view: 129, 36, 5                  ← 처음 화면: 가운데 경도, 위도, 확대 배율
search: 124, 142, 30, 43.5        ← 전투를 찾을 범위: 서쪽 경도, 동쪽 경도, 남쪽 위도, 북쪽 위도
min-links: 3                      ← 위키백과 언어판이 이 수 이상인 전투만 (지역 전쟁은 낮게)
side.a.ko: 일본                   ← 진영 이름(8개 언어). 진영을 안 나누면 생략 → 나라별 색
side.b.ko: 조선·명
```

## sides.txt

```
Warring States Japan = a
Joseon = b
Kingdom of Italy = a 1940-06 ~ 1943-09
Kingdom of Italy = b 1943-10 ~
```

- `원본 이름 = a | b | n [시작 ~ 끝]`. 기간은 theme의 unit 형식. 생략하면 전체, 한쪽을 비우면 열린 기간. 기간이 맞는 마지막 줄이 이긴다.
- 없는 나라는 기타(n). 원본 이름은 `public/campaigns/<id>/borders/*.json`의 `n` 값.
- 국경(점령지 포함)은 원본 데이터가 **연 단위**라 한 해 안에서는 모양이 같고, 진영 색·전투는 월 단위로 바뀐다.

## battles.txt

```
@ battle-of-myeongnyang
wikipedia: Battle of Myeongnyang
when: 1597-10                     ← unit 형식. 기간이면 "1597-08 ~ 1597-10"
coords: 126.31, 34.57
links: 25                         ← 위키백과 언어판 수 = 중요도(목록 순서·표시 크기)
```

- 자동 생성은 "기간 안 + search 범위 안 + 언어판 min-links 이상"인 Wikidata 전투·포위전·작전·전역.
  범위 안의 다른 전쟁 전투가 섞일 수 있으니 확인하고 지운다.
- `npm run wars:fetch -- <id> --list`는 battles.txt를 다시 만든다(손으로 고친 내용은 사라짐).
