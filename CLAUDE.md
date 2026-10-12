@AGENTS.md

# 크로노맵 (ChronoMap)

연도 게이지를 움직이면 그 시점의 지역별(한국·중국·일본·유럽·아메리카 등) 주요 세계사를 보여주는 웹사이트.
기획서: `docs/기획서.md` — 기능 ID(F-01 등)는 기획서 3장 기준.

## 절대 원칙

1. **모바일 우선 (Mobile-first).** 모든 화면은 360px 폭에서 먼저 설계·확인하고, 데스크톱은 `md:` 이상 브레이크포인트로 확장한다.
   - Tailwind 기본 클래스 = 모바일, `md:`/`lg:` = 확장. 반대(데스크톱 기본 + `max-md:`)로 쓰지 않는다.
   - 터치 대상은 최소 44×44px. hover에만 의존하는 기능 금지(모바일엔 hover가 없음).
   - 연도 게이지: 모든 화면에서 하단 고정 가로 한 줄(row).
   - 화면 구성: 지도가 브라우저 화면 전체(`h-dvh`)를 덮고, 헤더·시점 바·사건 목록·게이지는 그 위에 떠 있다. 페이지 스크롤 없음.
   - 사건 목록: 모바일은 게이지 위 접이식 시트, `lg:` 이상은 오른쪽 패널.
   - 하단 고정 UI는 `env(safe-area-inset-bottom)`을 고려한다(아이폰 홈 인디케이터).
   - 가로 스크롤 금지. 지도의 핀치 줌 외에는 페이지 확대를 막지 않는다.
2. **백엔드 없음.** `next.config.ts`의 `output: "export"`를 유지한다. 아래는 쓰지 않는다:
   API Route(Request 사용), Server Action, cookies/headers, rewrites/redirects, proxy, ISR, 기본 이미지 최적화.
   동적 라우트는 반드시 `generateStaticParams()` + `dynamicParams = false`.
3. **콘텐츠 원본은 `content/`의 텍스트 파일(서버 DB 없음).** 사건은 `content/events/<지역>.txt`, 시점별 순서는 `content/rankings/<시점>.txt`. `npm run content`가 `src/data/generated/content.json`으로 변환한다(dev/build 전에 자동, git에 안 올림). 형식은 `content/CLAUDE.md`.
   - 사건은 모두 기간(`start`~`end`)으로 다룬다. 한 해 사건은 `start === end`.
   - 사건 설명은 **위키백과**(무료, CC BY-SA 4.0)에서 가져와 가공하지 않고 보여준다 — 출처 링크 표기 필수. `npm run wiki`가 `content/wikipedia.json`에 받아 두고(git에 올림), 빌드는 네트워크 없이 이 파일만 쓴다.
   - 연도 선택 단위는 **기간**: 기원전은 세기(100년), 서기는 10년(`lib/period.ts`). 현재 기간은 게이지 손잡이 위에 표시한다.
   - 외부 API(위키백과·Wikidata)는 빌드 전 스크립트에서만 부르고 결과를 파일로 캐시한다. 사이트 방문자는 API를 부르지 않는다. 정적 지도 데이터 캐시 시간은 `vercel.json`.
   - 대한민국 관련 영토·명칭은 대한민국 입장(독도, 동해). 그 밖의 분쟁은 각 언어 위키백과 표기 — `content/CLAUDE.md` 표기 원칙.
4. **세계지도는 평면(메르카토르)이고 시점이 8개다.** 동아시아(기본)·중앙아시아·서아시아·동유럽·서유럽·북아메리카·남아메리카·오세아니아. 시점을 고르면 그 경도가 가운데로 회전하고, 사건 목록이 그 시점 기준 중요도로 다시 정렬된다. 좌우로 끌면 끝없이 이어진다.
   - 지도의 나라 영역·이름은 **선택 연도의 역사 국경**(Cliopatria, CC BY 4.0 — 화면 출처 표기 필수). `public/borders/`는 `npm run borders`로 생성.
5. **테마는 일반(기본)/다크.** 일반 = 종이 세계지도 느낌(하늘색 바다, 베이지 육지), 다크 = 남색 바다. 기기 설정을 따르지 않고 항상 일반으로 시작한다. 색은 `globals.css`의 CSS 변수로만 지정한다.
6. **다국어 8개, 한국어 기본.** ko(`/`), en, zh, es, hi, ar, fr, pt(`/en` 등). 화면 문구는 하드코딩하지 않고 `src/i18n/messages`에서 가져온다. 아랍어는 RTL.
7. **배포·애드센스는 개발 완료 후.** 지금은 `src/features/ads`에 손대지 않는다.

## 폴더 구조

```
content/               사람·AI가 편집하는 원본 데이터(사건, 시점별 순서, 나라 이름 수정) → content/CLAUDE.md
content/campaigns/     전쟁 지도 데이터: 전쟁마다 폴더(설정·진영·전투)          → content/campaigns/CLAUDE.md
public/borders/        연도별 역사 국경 + 언어별 나라 이름 (생성물, git에 올림)
public/campaigns/      전쟁 지도별 국경 스냅샷 (생성물, git에 올림)
public/geo/            확대 시 쓰는 자세한 해안선(50m)
src/
  app/                 라우트와 화면 조립만. 로직은 features로 위임   → src/app/CLAUDE.md
  i18n/                언어 목록·번역 사전·언어 선택                  → CLAUDE.md
  features/
    timeline/          연도 게이지, 시대 레이블                        → CLAUDE.md
    map/               평면 지도, 역사 국경, 시점 바, 사건 핀           → CLAUDE.md
    events/            시점별로 정렬된 사건 목록 패널                  → CLAUDE.md
    campaign/          전쟁 지도 (/wars, /wars/<id>) — 본 지도와 코드 공유 안 함 → CLAUDE.md
    pages/             글 페이지: 사건 상세·소개·개인정보처리방침        → CLAUDE.md
    ads/               AdSense 슬롯 (개발 완료 후)                     → CLAUDE.md
  components/ui/       도메인을 모르는 공용 UI(테마 토글 등)           → CLAUDE.md
  store/               zustand 전역 상태                               → CLAUDE.md
  data/                지역·시점·카테고리 정의 + 콘텐츠 진입점          → CLAUDE.md
  lib/                 순수 함수(타입, 연도 표기, 필터, 정렬)          → CLAUDE.md
scripts/               데이터 변환 (build-content.ts, fetch-wikipedia.ts, draft-events.ts, build-borders.mjs, campaigns/, lib/ 공용)
docs/                  기획서
```

각 폴더의 `CLAUDE.md`가 그 모듈의 규칙이다. 해당 폴더 파일을 수정하기 전에 반드시 읽는다.

## 모듈 의존 방향

```
app → features → (i18n, store, lib, data, components/ui)
```

- features끼리는 서로 import하지 않는다. 공유가 필요하면 store나 lib으로 올린다.
- 사건 데이터는 `src/data/content.ts`(EVENTS, RANKINGS)로만 가져온다. 생성된 JSON을 직접 import하지 않는다.
- 정렬·필터 같은 규칙은 `lib/`의 순수 함수(`events.ts`, `ranking.ts`)에 둔다. 컴포넌트는 결과만 그린다.
- lib은 React를 import하지 않는다(순수 함수).
- 각 feature는 `index.ts`로 외부에 공개할 것만 export한다. 외부에서 내부 파일 직접 import 금지.

## 코드 규칙

- TypeScript strict. `any` 금지.
- 컴포넌트는 기본 서버 컴포넌트. 상태·이벤트가 필요한 것만 `"use client"`.
- 파일명: 컴포넌트 `PascalCase.tsx`, 그 외 `camelCase.ts`.
- 사용자에게 보이는 문구는 반드시 i18n 사전(`useI18n().messages`)에서 가져온다. 새 문구는 8개 언어 사전에 모두 추가(타입이 빠진 언어를 잡아준다).
- 연도는 반드시 `lib/year.ts`의 `formatYear(year, locale)`로, 사건 텍스트는 `lib/localize.ts`의 `pick()`으로 표시.
- 좌우 여백·위치는 RTL 대응을 위해 `ms-/me-/ps-/pe-/start-/end-` 논리 속성을 쓴다(`ml-/mr-/left-/right-` 지양).
- 색만으로 지역을 구분하지 않는다(라벨·아이콘 병행).
- 크기: 글자가 작다는 피드백이 있었다. 본문 16px 이상(큰 화면 18~19px, 패널 제목 24~26px), 보조 글자 14px 이상, 지도 위 버튼·하단 바 버튼은 48px(`size-12`/`h-12`). 이보다 줄이지 않는다.
- 디자인: 이모지 금지 — 아이콘은 `components/ui/icons.tsx`의 선 아이콘만. 장식(그림자·그라데이션·큰 둥근 알약 모양)은 최소로, 테두리 1px + `rounded-md/lg` 정도의 절제된 스타일.
- 색상은 하드코딩하지 않고 Tailwind 테마 색(`bg-surface`, `border-line`, `text-muted`, `bg-chip`, `text-accent`)이나 CSS 변수를 쓴다. 지역 고유색만 `data/regions.ts`에서 가져온다.

## 명령어

```bash
npm run dev     # 개발 서버 http://localhost:3000 (사건 데이터 변환 포함)
npm run content # content/*.txt + wikipedia.json → src/data/generated/content.json
npm run wiki    # 사건의 위키백과 요약(8개 언어) 받기 (새 문서만, 전부는 -- --all)
npm run borders # 역사 국경 스냅샷 재생성 (원본 내려받기는 스크립트 주석 참고, 수 분 걸림)
npm run draft   # Wikidata에서 사건 후보 → content/drafts (-- --promote 55 로 바로 추가)
npm run wars:fetch / wars:borders / wars:build   # 전쟁 지도 데이터 (content/campaigns/CLAUDE.md)
npm run build   # 정적 빌드 → out/  (백엔드 기능을 쓰면 여기서 실패한다)
npm run lint
```

## 개발 서버 주의

- `globals.css`를 바꿨는데 화면에 반영이 안 되면 개발 서버 캐시 문제다: 서버를 끄고 `.next`를 지운 뒤 다시 실행.

## Git

- 원격 저장소: https://github.com/FlutterNeverDie/chrono-map (브랜치 `main`)
- 커밋·푸시는 사용자가 요청할 때만. 커밋 메시지에 Co-Authored-By 넣지 않는다.
