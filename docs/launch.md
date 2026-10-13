# 배포·광고 연결 순서

코드 쪽 준비는 끝나 있다(아래 "준비 완료"). 남은 일은 계정·화면 작업이라 사용자와 함께 브라우저에서 진행한다.

## 준비 완료 (코드)

- 정적 빌드(`npm run build` → `out/`), 빌드 후 RSC 페이로드 정리(`scripts/prune-out.mjs`)
- 사이트맵·robots, canonical·hreflang, OG 이미지(첫 화면·연도·사건), 사이트 아이콘
- 소개·연락처·개인정보처리방침(AdSense 필수 문구·Google 정책 링크 포함, 8개 언어), 404 페이지
- 광고 기반: `src/features/ads`(스크립트·광고 칸·ads.txt). 환경변수가 없으면 아무것도 그리지 않는다
- Search Console 소유 확인 메타 태그 자리

## 환경변수 (Vercel → Project → Settings → Environment Variables)

| 이름 | 예 | 언제 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://chronomap.example` | 도메인 연결 직후(사이트맵·canonical·OG 주소) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console의 HTML 태그 값 | Search Console 등록 때 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | (선택) 연락용 이메일 | 연락처에 이메일을 보일 때 |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-0000000000000000` | AdSense 신청 때(심사 코드 = 이 스크립트, ads.txt도 채워짐) |
| `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` | 광고 단위 ID | 승인 후 광고 단위를 만든 뒤 |

환경변수를 바꾸면 다시 배포해야 반영된다(빌드 때 HTML에 들어감).

## 순서

1. **Vercel 배포**: GitHub 저장소 연결 → Framework Next.js, Build `npm run build`, Output `out`. (CLI 업로드는 무료 플랜 용량 제한이 있어 GitHub 연동 빌드를 쓴다.)
2. **도메인**: 독자 도메인 구입·연결(`*.vercel.app`은 AdSense 승인이 어렵다) → `NEXT_PUBLIC_SITE_URL` 지정 후 재배포.
3. **Search Console**: 도메인 속성 추가 → 소유 확인(DNS 또는 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) → `sitemap.xml` 제출.
4. **AdSense 신청**: 사이트 추가 → `NEXT_PUBLIC_ADSENSE_CLIENT` 지정·재배포 → `/ads.txt` 확인 → 심사 요청(1~4주).
5. **동의 메시지(CMP)**: AdSense → 개인 정보 보호 및 메시지 → 유럽 규정 메시지 만들기·게시.
6. **승인 후**: 디스플레이 광고 단위(반응형) 만들기 → `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` 지정·재배포 → 사건 상세·연도 페이지에서 광고 확인. 자동 광고는 글 페이지에서만 시험.
7. **확인**: 모바일에서 광고가 게이지·카드를 가리지 않는지, 레이아웃 밀림(CLS) 없는지, Search Console 색인 상태.
