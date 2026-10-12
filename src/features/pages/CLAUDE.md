# features/pages — 글 페이지 (지도 아닌 화면)

- `PageShell`: 상단 바(사이트 이름·언어·테마) + 본문 + `SiteFooter`(소개·개인정보처리방침 링크, 데이터 출처).
- `EventDetail` (/event/[id], /[언어]/event/[id]): 사건 제목·시기·지역·장소·분류, 위키백과 첫 문단, 원문 링크 + CC BY-SA 4.0, "지도에서 보기"(`?y=시작연도`). 검색 노출용 메타데이터는 `eventMetadata`.
- `TextPage` (/about, /privacy): 문구는 i18n 사전 `pages.aboutBody`·`pages.privacyBody`. 내용을 바꾸면 8개 언어 모두 고친다.
- 서버 컴포넌트로 빌드 때 정적 HTML이 된다(검색·애드센스 심사에 중요).
