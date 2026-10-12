# app — 라우트 규칙

- 이 폴더에는 라우트 파일(page, layout, not-found, sitemap, robots)만 둔다. UI 로직은 `src/features`에서 가져온다.
- 동적 라우트(`/year/[year]`, `/event/[slug]`)는 반드시 `generateStaticParams()`와 `export const dynamicParams = false`를 둔다. 정적 export에서 빠지면 빌드가 실패한다.
- 모든 페이지는 `metadata` 또는 `generateMetadata`로 고유 title/description을 갖는다(SEO).
- `layout.tsx`의 `<html lang="ko">` 유지. viewport는 `export const viewport`로 지정한다(`viewport-fit=cover`로 safe-area 사용).
- 레이아웃은 모바일 기준: 상단 헤더 → 본문(스크롤) → 하단 고정 게이지. `md:` 이상에서 좌측 게이지 + 본문 + 우측 여백(나중에 광고 자리).
- 쿠키·헤더·Server Action·Request 기반 Route Handler 금지(루트 CLAUDE.md 2번).
