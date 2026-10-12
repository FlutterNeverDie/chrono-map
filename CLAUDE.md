@AGENTS.md

# 크로노맵 (ChronoMap)

연도 게이지를 움직이면 그 시점의 대륙별 주요 세계사를 보여주는 웹사이트.
기획서: `docs/기획서.md` — 기능 ID(F-01 등)는 기획서 3장 기준.

## 절대 원칙

1. **모바일 우선 (Mobile-first).** 모든 화면은 360px 폭에서 먼저 설계·확인하고, 데스크톱은 `md:` 이상 브레이크포인트로 확장한다.
   - Tailwind 기본 클래스 = 모바일, `md:`/`lg:` = 확장. 반대(데스크톱 기본 + `max-md:`)로 쓰지 않는다.
   - 터치 대상은 최소 44×44px. hover에만 의존하는 기능 금지(모바일엔 hover가 없음).
   - 연도 게이지: 모바일은 화면 하단 가로, 데스크톱(`md:`)은 좌측 세로.
   - 기본 뷰: 모바일은 대륙 카드 뷰, 데스크톱은 지도 뷰.
   - 하단 고정 UI는 `env(safe-area-inset-bottom)`을 고려한다(아이폰 홈 인디케이터).
   - 가로 스크롤 금지. 지도의 핀치 줌 외에는 페이지 확대를 막지 않는다.
2. **백엔드 없음.** `next.config.ts`의 `output: "export"`를 유지한다. 아래는 쓰지 않는다:
   API Route(Request 사용), Server Action, cookies/headers, rewrites/redirects, proxy, ISR, 기본 이미지 최적화.
   동적 라우트는 반드시 `generateStaticParams()` + `dynamicParams = false`.
3. **데이터는 `src/data/*.json`.** DB·외부 API 호출 없음. 빌드 시 읽어 정적 HTML로 만든다.
4. **배포·애드센스는 개발 완료 후.** 지금은 `src/features/ads`에 손대지 않는다.

## 폴더 구조

```
src/
  app/                 라우트(페이지)만. 로직은 features로 위임      → src/app/CLAUDE.md
  features/
    timeline/          연도 게이지, 시대 레이블, 비선형 시간 축      → CLAUDE.md
    map/               세계 지도 뷰(d3-geo)                          → CLAUDE.md
    events/            사건 카드·대륙 카드 뷰·사건 상세               → CLAUDE.md
    filters/           대륙·카테고리 필터                             → CLAUDE.md
    ads/               AdSense 슬롯 (개발 완료 후)                    → CLAUDE.md
  components/ui/       기능과 무관한 공용 UI(버튼, 시트 등)          → CLAUDE.md
  store/               zustand 전역 상태                              → CLAUDE.md
  data/                사건·시대 JSON                                 → CLAUDE.md
  lib/                 순수 함수(연도 포맷, 스케일 등)               → CLAUDE.md
docs/                  기획서 등 문서
```

각 폴더의 `CLAUDE.md`가 그 모듈의 규칙이다. 해당 폴더 파일을 수정하기 전에 반드시 읽는다.

## 모듈 의존 방향

```
app → features → (store, lib, data, components/ui)
```

- features끼리는 서로 import하지 않는다. 공유가 필요하면 store나 lib으로 올린다.
- lib은 React를 import하지 않는다(순수 함수).
- 각 feature는 `index.ts`로 외부에 공개할 것만 export한다. 외부에서 내부 파일 직접 import 금지.

## 코드 규칙

- TypeScript strict. `any` 금지.
- 컴포넌트는 기본 서버 컴포넌트. 상태·이벤트가 필요한 것만 `"use client"`.
- 파일명: 컴포넌트 `PascalCase.tsx`, 그 외 `camelCase.ts`.
- 사용자에게 보이는 문구는 한국어. 연도는 반드시 `lib/year.ts`의 `formatYear()`로 표시.
- 색만으로 대륙을 구분하지 않는다(라벨·아이콘 병행).

## 명령어

```bash
npm run dev     # 개발 서버 http://localhost:3000
npm run build   # 정적 빌드 → out/  (백엔드 기능을 쓰면 여기서 실패한다)
npm run lint
```

## Git

- 원격 저장소: https://github.com/FlutterNeverDie/chrono-map (브랜치 `main`)
- 커밋·푸시는 사용자가 요청할 때만. 커밋 메시지에 Co-Authored-By 넣지 않는다.
