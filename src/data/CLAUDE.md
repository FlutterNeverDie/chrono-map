# data — 사건·시대 데이터

- `events.json`: 사건 배열. 스키마는 `docs/기획서.md` 4장, 타입은 `src/lib/types.ts`의 `HistoryEvent`.
- `eras.json`: 시대 정의.
- `continents.ts`: 대륙 목록·순서·표시명·색상(단일 출처).

## 데이터 규칙
- 기원전은 음수 연도(기원전 221년 = -221). 0년은 없다.
- `id`는 영문 kebab-case, 한번 정하면 바꾸지 않는다(URL `/event/[id]`로 쓰임).
- 모든 사건은 `sources`에 최소 1개 출처 URL. 연도·장소는 출처와 대조한 것만 넣는다.
- `coords`는 `[경도, 위도]`.
- 이미지는 퍼블릭 도메인·CC 라이선스만, `public/images/events/`에 webp로.
- 수정 후 `npm run build`가 통과해야 한다(타입 검증).
