# content/topics — 주제 지도 (/maps/<id>): 역병·발명 … N개

지도 하나 = 폴더 하나(`content/topics/<id>/`). **폴더를 추가하면 상단 탭·라우트·사이트맵이 자동으로 생긴다.**

```bash
npm run topics:fetch -- <id>   # 항목들의 위키백과 요약(8개 언어) 받기 → <id>/wikipedia.json (자동 생성, 직접 고치지 않음)
npm run topics:build           # src/data/generated/topics.json (dev/build 때 자동)
```

## topic.txt

```
order: 1                         ← 상단 탭 순서
mode: span                       ← span: 기간 동안만 보임(전염병) | persist: 생긴 뒤 계속 남음(발명)
scale: -430, 500, 1300, 1700, 1850, 1950, 2025   ← 슬라이더 눈금 연도. 같은 간격으로 놓여 비선형 축이 된다
show-month-from: 1800            ← (선택) 이 연도부터 슬라이더에 월까지 표시
view: 40, 30, 1                  ← 처음 화면: 가운데 경도, 위도, 확대 배율
color: #b4232a                   ← 항목 점·경로·슬라이더 색
icon: virus                      ← 하단 바 지도 아이콘: virus | bulb | map(기본). 새 아이콘은 components/ui/icons + app/BottomBar의 MAP_ICONS
title.ko: 역병 지도               ← 8개 언어 (title.ko 필수)
description.ko: …                ← 8개 언어 (검색 노출용 설명)
```

## items.txt

```
@ black-death
wikipedia: Black Death           ← 영어 위키백과 문서 (제목·설명·출처가 여기서 옴)
when: 1346 ~ 1353                ← "YYYY" 또는 "YYYY-MM", 기원전은 음수. 한 시점이면 "when: 1903"
precision: approx                ← (선택) 대략적인 시기 → "약 ~" (선사시대 등)
coords: 35.38, 45.03             ← 경도, 위도 (발원지·처음 나온 곳)
spread: 1347-05 28.98, 41.01 | 1348-06 2.35, 48.86   ← (선택) 퍼져 나간 지점: "시기 경도, 위도"를 | 로 구분
importance: 5                    ← 1~5 (목록 순서)
title.ko: 발한병                 ← (선택) 그 언어 위키백과 문서가 없을 때 쓰는 제목·설명 (title.<언어>, summary.<언어>)
```

- 위치·시기는 위키백과 문서와 대조한다. 확산 지점은 대표 도시 몇 곳이면 충분하다(대략적인 경로).
- 슬라이더의 ◀ ▶·재생은 항목 등장·확산 시점으로 건너뛴다.
- 새 지도 예시: 탐험 항로, 종교 전파, 제국 수도, 세계유산 … (`mode`와 `spread`로 대부분 표현 가능).
