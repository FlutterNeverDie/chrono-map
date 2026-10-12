# content/ww2 — 2차대전 지도 데이터 (크로노맵 본 데이터와 별개)

| 파일 | 내용 | 만드는 법 |
| --- | --- | --- |
| `battles.txt` | 전투·작전 목록(사람·AI가 편집) | 처음엔 `npm run ww2:fetch`가 Wikidata에서 생성 |
| `sides.txt` | 나라별 진영(추축국·연합국·중립)과 기간 | 직접 편집 |
| `wikipedia.json` | **자동 생성, 직접 고치지 않음.** 전투별 위키백과 요약(8개 언어) | `npm run ww2:fetch` |

국경은 `public/ww2/borders/<연도>.json`(1937~1945, `npm run ww2:borders`, 원본 Cliopatria CC BY 4.0).
앱 데이터는 `npm run ww2:build` → `src/data/generated/ww2.json` (dev/build 때 자동).

## battles.txt

```
@ battle-of-stalingrad
wikipedia: Battle of Stalingrad      ← 영어 위키백과 문서 제목 (설명·출처는 여기서)
when: 1942-08 ~ 1943-02              ← 월 단위. 한 달이면 "when: 1941-12"
coords: 44.53, 48.71                 ← 경도, 위도
links: 108                           ← 위키백과 언어판 수 = 중요도(목록 순서·점 크기)
```

- 새 전투를 넣었으면 `npm run ww2:fetch`(빠진 요약만 받음) → `npm run ww2:build`.
- Wikidata 분류가 달라 자동으로 안 잡히는 큰 전투는 `scripts/ww2/fetch.ts`의 `EXTRA`에도 넣어 두면 목록을 다시 만들 때 유지된다.

## sides.txt

```
Kingdom of Italy = axis 1940-06 ~ 1943-09
Kingdom of Italy = allies 1943-10 ~
```

- `원본 이름 = 진영 [시작 ~ 끝]`, 기간은 YYYY-MM. 생략하면 전체, 끝을 비우면 종전까지. 여러 줄이면 기간이 맞는 마지막 줄.
- 없는 나라는 중립. 원본 이름은 `public/ww2/borders/*.json`의 `n` 값.
- 국경(점령지 포함)은 연 단위가 원본 데이터의 한계이고, 진영은 월 단위로 바뀐다.
