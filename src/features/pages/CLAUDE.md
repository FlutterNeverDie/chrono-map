# features/pages — 글 페이지 (지도 아닌 화면)

- `PageShell`: 상단 바(사이트 이름·언어·테마) + 본문 + `SiteFooter`(소개·개인정보처리방침 링크, 데이터 출처).
- `EventDetail` (/event/[id], /[언어]/event/[id]): 사건 제목·시기·지역·장소·분류, 위키백과 첫 문단, 원문 링크 + CC BY-SA 4.0, "지도에서 보기"(`?y=시작연도`). 검색 노출용 메타데이터는 `eventMetadata`.
- `TextPage` (/about, /privacy): 문구는 i18n 사전 `pages.aboutBody`·`pages.privacyBody`. 내용을 바꾸면 8개 언어 모두 고친다.
- 서버 컴포넌트로 빌드 때 정적 HTML이 된다(검색·애드센스 심사에 중요).
- 연도 페이지 (/year, /year/[slug], 언어별 /en/year/…, F-11): `years.ts`가 기간 목록·내용, `YearDetail`·`YearIndex`가 화면, 메타데이터는 `yearMetadata`·`yearIndexMetadata`(canonical·hreflang 포함).
  - 주소: 서기는 10년 단위 시작 연도(`/year/1490`), 기원전은 세기(`/year/300bc` = 기원전 300–201년).
  - **그 기간에 시작한 사건이 하나 이상인 기간만** 만든다(빈 페이지 방지). 사건을 추가하면 페이지도 자동으로 늘어난다.
  - 내용: 그 기간에 시작한 사건(위키백과 첫 문단을 자르지 않고 넣고 화면에서만 `line-clamp-3`), 이어지는 일, 같은 무렵(지도가 그 기간에 함께 보여주는 앞뒤 사건), 이 시기의 다른 지도, 이전·다음 기간.
  - 들어오는 길: 바닥글 "연도별", 사건 상세의 "○○년대 세계사" 버튼, 사이트맵.
- 공유 미리보기 이미지(OG): `og.ts`가 첫 화면·연도·사건 카드 내용을 만들고, 그리기는 `components/og`. 라우트는 `app/…/og.png/route.tsx`.
