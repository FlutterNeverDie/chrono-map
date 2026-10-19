# 절대 원칙

1. **모바일 우선.** 360px 폭에서 먼저 설계·확인하고 `md:`/`lg:`로 확장한다(반대로 `max-md:` 기본 금지).
   - 터치 대상 최소 44×44px, hover에만 의존하는 기능 금지, 하단 고정 UI는 `env(safe-area-inset-bottom)` 고려, 가로 스크롤 금지.
   - 지도 화면: 지도가 `h-dvh` 전체를 덮고 상단 바·패널·하단 게이지가 위에 떠 있다. 페이지 스크롤 없음.
   - 목록 패널: 모바일은 하단 접이식 시트, `lg:` 이상은 오른쪽 패널(`data-map-overlay` — 지도가 이 패널을 피해 가운데를 잡는다).
2. **백엔드 없음.** `next.config.ts`의 `output: "export"` 유지. API Route(Request), Server Action, cookies/headers, rewrites/redirects, proxy, ISR, 기본 이미지 최적화 금지. 동적 라우트는 `generateStaticParams()` + `dynamicParams = false`.
3. **외부 API는 빌드 전 스크립트에서만.** 위키백과·Wikidata 결과는 파일로 캐시해 git에 올리고, 빌드·방문자는 네트워크 없이 그 파일만 쓴다(자세히: [data-pipeline.md](data-pipeline.md)).
4. **출처 표기 필수.** 위키백과 글(CC BY-SA 4.0)은 가공하지 않고 출처·라이선스와 함께(상세 페이지는 문서 링크, 지도 카드는 출처 글자 + 목록 끝 라이선스 링크 + 각 카드 "자세히"로 문서 링크), 국경(Cliopatria, CC BY 4.0)은 지도에 출처를 표시한다.
5. **표기 원칙.** 대한민국 관련 영토·명칭은 대한민국 입장(독도, 동해). 그 밖의 분쟁은 각 언어 위키백과 표기(`content/CLAUDE.md`).
6. **테마**: 일반(기본, 종이 지도 느낌) / 다크. 기기 설정을 따르지 않는다. 색은 `globals.css`의 CSS 변수로만.
7. **다국어 8개, 한국어 기본**: ko(`/`), en, zh, es, hi, ar(RTL), fr, pt(`/en` …). 화면 문구는 `src/i18n/messages`에서만.
8. **광고는 기반만 준비됨.** `src/features/ads`는 환경변수가 없으면 아무것도 그리지 않는다. 실제 연결·배치 변경은 `docs/launch.md` 순서대로 사용자와 함께 진행한다.
