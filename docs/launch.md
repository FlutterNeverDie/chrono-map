# 배포·광고 연결 순서

코드 쪽 준비는 끝나 있다(아래 "준비 완료"). 남은 일은 계정·화면 작업이라 사용자와 함께 브라우저에서 진행한다.

## 준비 완료 (코드)

- 정적 빌드(`npm run build` → `out/`), 빌드 후 RSC 페이로드 정리(`scripts/prune-out.mjs`)
- 사이트맵·robots, canonical·hreflang, OG 이미지(첫 화면·연도·사건), 사이트 아이콘
- 소개·연락처·개인정보처리방침(AdSense 필수 문구·Google 정책 링크 포함, 8개 언어), 404 페이지
- 광고 기반: `src/features/ads`(스크립트·광고 칸·ads.txt). 환경변수가 없으면 아무것도 그리지 않는다
- Search Console 소유 확인 메타 태그 자리

## 환경변수 (Cloudflare → Workers & Pages → 프로젝트 → Settings → Variables and Secrets, Production)

| 이름 | 예 | 언제 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://chronomap.example` | 도메인 연결 직후(사이트맵·canonical·OG 주소). 없으면 `https://historymapworld.com`(site.ts 기본값) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console의 HTML 태그 값 | Search Console 등록 때 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | (선택) 연락용 이메일 | 기본값 oasa741@gmail.com(TextPage.tsx). 바꿀 때만 |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-0000000000000000` | AdSense 신청 때(심사 코드 = 이 스크립트, ads.txt도 채워짐) |
| `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` | 광고 단위 ID | 승인 후 광고 단위를 만든 뒤 |

환경변수를 바꾸면 다시 배포해야 반영된다(빌드 때 HTML에 들어감).

## 순서

호스팅은 **Cloudflare**(Workers 정적 파일, 무료 플랜, 상업적 사용 가능). Vercel 무료(Hobby) 플랜은 광고를 넣으면 상업적 사용이라 Pro가 필요해서 쓰지 않는다.
빌드 결과 제한: 무료 플랜은 파일 2만 개·파일당 25MB — 지금 약 1만 개(빌드 후 정리 `prune-out`이 RSC 페이로드를 지워서), 5MB 넘는 파일 없음.

1. **Cloudflare 배포**: Workers & Pages → Create → Import a repository(GitHub) → `chrono-map`.
   - Build command `npm run build`, Deploy command `npx wrangler deploy`(기본값). 배포 설정은 저장소의 `wrangler.jsonc`(정적 파일 `out/`만 올림).
   - `wrangler.jsonc`가 없으면 wrangler가 Next.js를 알아보고 서버용 변환(OpenNext)을 붙이려다 실패한다 — 지우지 않는다.
   - Node 버전은 `.node-version`(22). 빌드는 약 5분(무료 제한 20분). 캐시 헤더는 `public/_headers`, 404는 `out/404.html`.
   - 주소는 `https://chrono-map.<계정 하위 도메인>.workers.dev`. 도메인 연결 전까지 `NEXT_PUBLIC_SITE_URL`에 이 주소를 넣는다.
   - **자동 배포**: `.github/workflows/deploy.yml` — main에 푸시하면 GitHub Actions가 빌드·배포한다. 저장소 Secret `CLOUDFLARE_API_TOKEN` 필요(Cloudflare API Tokens의 "Edit Cloudflare Workers" 템플릿). Cloudflare 쪽 Git 연결 빌드는 쓰지 않는다(권한 문제로 멈춰 있었음).
   - **직접 배포**(Actions를 못 쓸 때): `npx wrangler login`(한 번) → `npm run build` → `npx wrangler deploy`. 바뀐 파일만 올라간다.
2. **도메인**: ✅ `historymapworld.com`(2026-10-13 구입, wrangler.jsonc의 routes로 연결). 다른 도메인이면 Cloudflare Registrar에서 구입(원가, .com 연 10달러 안팎) → 프로젝트 → Settings → Domains & Routes에 연결 → `NEXT_PUBLIC_SITE_URL` 지정 후 다시 배포. (`*.workers.dev`·`*.pages.dev`는 AdSense 승인이 안 된다.)
3. **Search Console**: 도메인 속성 추가 → 소유 확인(DNS 또는 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) → `sitemap.xml` 제출.
4. **AdSense 신청**: 게시자 ID `ca-pub-1402935877769846`(features/ads/config.ts 기본값, 2026-10-14). 사이트 추가 → `NEXT_PUBLIC_ADSENSE_CLIENT` 지정·재배포 → `/ads.txt` 확인 → 심사 요청(1~4주).
5. **동의 메시지(CMP)**: AdSense → 개인 정보 보호 및 메시지 → 유럽 규정 메시지 만들기·게시.
6. **승인 후**: 디스플레이 광고 단위(반응형) 만들기 → `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` 지정·재배포 → 사건 상세·연도 페이지에서 광고 확인. 자동 광고는 글 페이지에서만 시험.
7. **확인**: 모바일에서 광고가 게이지·카드를 가리지 않는지, 레이아웃 밀림(CLS) 없는지, Search Console 색인 상태.
