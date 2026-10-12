# app — 라우트 규칙

- 라우트 파일 + 화면 조립(`HomeScreen.tsx` 크로노맵, `Ww2Screen.tsx` 2차대전), 공용 상단 바 `SiteHeader.tsx`(지도 탭 · 화면별 도구 · 언어·테마), html 뼈대 `RootDocument.tsx`만 둔다. UI 로직은 `src/features`에서 가져온다.
- 라우트(언어마다 `/` 또는 `/en` 아래): 지도 `/`, 2차대전 `/ww2`, 사건 상세 `/event/[id]`, `/about`, `/privacy`, 그리고 `sitemap.xml`·`robots.txt`(주소는 `site.ts`, 배포 시 `NEXT_PUBLIC_SITE_URL`).
- 루트 레이아웃이 두 개다(다국어 + 한국어 기본 `/`):
  - `(home)/layout.tsx` + `page.tsx` → `/` (한국어). 전에 다른 언어를 골랐으면 그 언어 경로로 이동.
  - `[locale]/layout.tsx` + `page.tsx` → `/en`, `/zh` … (한국어 제외 7개, `generateStaticParams`).
  - 둘 다 `RootDocument`(`<html lang dir data-theme>`)를 쓴다. 두 레이아웃 사이 이동은 전체 새로고침이다.
- 타입은 Next 전역 헬퍼 `LayoutProps<"/[locale]">`, `PageProps<"/[locale]">`를 쓴다. 라우트를 바꾼 뒤 타입 오류가 나면 `npx next typegen`.
- 동적 라우트(`/year/[year]`, `/event/[slug]`)는 반드시 `generateStaticParams()`와 `export const dynamicParams = false`를 둔다. 정적 export에서 빠지면 빌드가 실패한다.
- 모든 페이지는 `metadata` 또는 `generateMetadata`로 고유 title/description을 갖는다(SEO).
- viewport는 각 레이아웃의 `export const viewport`로 지정한다(`viewport-fit=cover`로 safe-area 사용).
- 화면(`HomeScreen.tsx`): 지도가 하단 바 위 영역을 모두 덮고, 위에 연도 카드·시점 바·확대 버튼·사건 패널이 떠 있다. body는 스크롤하지 않는다.
  - 하단 바 높이는 CSS 변수 `--bar-h` 하나로 관리(모바일 두 줄: 게이지 / 언어·테마, `sm:` 이상 한 줄: [언어·테마 | 게이지]). 지도·패널·출처 표기는 이 값 위에 놓인다.
- 테마: SSR 기본값은 `data-theme="light"`. 저장된 값이 dark일 때만 `next/script`(`beforeInteractive`)가 바꾼다.
- 쿠키·헤더·Server Action·Request 기반 Route Handler 금지(루트 CLAUDE.md 2번).
