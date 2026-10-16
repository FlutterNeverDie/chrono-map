# 데이터 흐름과 명령어

모든 원본은 `content/`의 텍스트 파일. 스크립트가 변환해 `src/data/generated/`(git 제외, dev/build 전에 자동 생성)와 `public/`(git에 올림)에 둔다.

| 지도 | 원본 | 네트워크(가끔, 결과 캐시) | 빌드 때 자동(네트워크 없음) |
| --- | --- | --- | --- |
| 본 지도 사건 | `content/events`, `rankings` | `npm run wiki` → `content/wikipedia.json` | `npm run content` |
| 사건 검수 | `content/events` | `npm run audit` → Wikidata 날짜·좌표, 동음이의 문서, 긴 기간 등 의심 목록 출력(고치지 않음, 캐시 `data-raw/`) | — |
| 사건 후보 | — | `npm run draft` → `content/drafts` (`-- --promote 55`) | — |
| 역사 국경 | Cliopatria 원본(`data-raw/`) | `npm run borders` → `public/borders` | `npm run lands`(상세 페이지 자리를 다스린 나라, `public/borders` + 사건·전쟁·주제 지도 항목 좌표, 입력이 그대로면 건너뜀) |
| 전쟁 지도 | `content/campaigns/<id>` | `npm run wars:fetch` / `wars:borders` | `npm run wars:build` |
| 주제 지도 | `content/topics/<id>` | `npm run topics:fetch` | `npm run topics:build` |
| OG 이미지 글꼴 | 모든 OG 카드의 글자 | `npm run og:fonts` → `content/og-fonts` (사건 제목·문구가 바뀌면) | — (이미지는 `next build`가 생성) |

```bash
npm run dev     # 개발 서버 http://localhost:3000 (자동 변환 포함)
npm run build   # 정적 빌드 → out/ (백엔드 기능을 쓰면 여기서 실패)
npm run lint
```

- 사이트 방문자는 외부 API를 부르지 않는다. 정적 지도 데이터의 CDN·브라우저 캐시 시간은 `public/_headers`(Cloudflare Pages).
- 위키백과·Wikidata 요청은 `scripts/lib/wikipediaApi.ts` 한 곳(요청 제한 시 재시도, User-Agent 지정).
- 개발 서버 주의: `globals.css`를 바꿨는데 반영이 안 되면 서버를 끄고 `.next`를 지운 뒤 다시 실행.
