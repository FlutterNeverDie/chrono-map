# components/og — 공유 미리보기(OG) 이미지 (도메인 모름)

- `renderOg(card)`: 1200×630 PNG. 왼쪽 글자(사이트 이름·제목·부제·목록 3줄), 오른쪽 세계 지도(land-110m, 메르카토르) + 점. 색은 일반 테마 값을 직접 쓴다(이미지라 CSS 변수 불가).
- 지도 화면은 진한 점들의 경도를 덮는 가장 짧은 구간 가운데에 맞추고, 넓으면 축소한다(`view`). 점이 전 세계에 퍼져 있으면 기본 배율.
- 빌드 때 파일이 된다: `app/…/og.png/route.tsx`(`dynamic = "force-static"` + `generateStaticParams`). `opengraph-image` 파일 규칙은 정적 export에서 확장자 없는 파일이 나와(호스팅에서 이미지로 인식 못 할 수 있음) 쓰지 않는다.
  - 라우트 핸들러는 레이아웃의 `[locale]` 목록을 물려받지 않으므로 params에 locale을 직접 넣는다.
- 언어: 힌디어·아랍어는 이미지 엔진(satori)이 글자 조합·오른쪽→왼쪽 쓰기를 못 해 **영어 이미지를 가리킨다**(`ogLocale`, `ogImage`, 만드는 언어는 `OG_PATH_LOCALES`).
- 글꼴: `content/og-fonts/`의 부분 글꼴(Noto Sans / KR / SC, 500·700). `npm run og:fonts`가 모든 카드의 글자만 모아 Google Fonts에서 받는다(네트워크는 이 스크립트에서만, 결과는 git에).
  - **사건 제목·화면 문구를 바꾸면 `npm run og:fonts`를 다시 실행.** 빠진 글자가 있으면 빌드 로그에 `[og] 글꼴에 없는 글자`가 나온다.
  - 한 번에 400자씩 요청한다. 더 많으면 Google이 부분 글꼴 대신 전체 글꼴(10MB)을 준다(스크립트가 1MB 넘으면 실패시킴).
- satori 제약: 자식이 여럿인 div는 `display: flex`, `inset` 대신 top/left, 줄 수 제한(lineClamp) 대신 한 줄 `nowrap + ellipsis`.
