# 마케팅 TODO

사이트: https://historymapworld.com (해외 홍보는 `/en`)

## 완료

- [x] Search Console 사이트맵 다시 제출 (2026-10-14) - 10/13에 읽은 예전 사이트맵(주소가 `chrono-map.histlab.workers.dev`)이라 "URL이 허용되지 않음" 오류 5,744개 → 다시 제출 후 성공
- [x] 모든 페이지에 canonical·hreflang (2026-10-15) - www로 열어도 검색에는 historymapworld.com 주소 하나만 잡힌다
- [x] 영어판(`/en`) 점검·수정 (2026-10-15) - 사건 제목·날짜, 위키 요약 찌꺼기, 미리보기 설명, 화면 문구, 지도 나라 이름(문서 연결 오류·독립한 땅), 전쟁 지도에 섞인 다른 전쟁 전투 133개, 도시 문서에 연결된 전투
- [x] 영어판 남은 것 (2026-10-15) - 전쟁 지도 국경에도 나라 이름 고침 적용(POLITY_FIXES 공용화), 영국·아덴·오만 분리, 네덜란드령 수리남, 시대·민족 이름, 확신 낮은 전투 정리, WWII 영어 설명에 1937년 시작 이유 명시, 영어 연도 "AD 9"·"1592–1598"
- [x] 콘텐츠 보강 (2026-10-15) - 사건 113건 추가(489 → 602, 서기 1~1000년·문화·종교·과학 위주, 지역별 빈 시기), 종교 지도 추가(29개 항목)

## 할 일

- [ ] (선택) Cloudflare에서 www → historymapworld.com 301 리디렉션 (Rules → Redirect Rules → "Redirect from WWW to root") - canonical로 검색 문제는 해결됨. 주소창까지 통일하고 싶을 때만
- [ ] 홍보 영상 - 기원전 3400년 → 2024년 국경 변화 15~20초 (MP4·GIF, 가로·세로)
- [ ] 스레드 "오늘의 세계사" 자동 게시 연결 (아래 스레드)
- [ ] Reddit 계정 준비 (아래)
- [ ] Reddit 글 올리기 (아래 순서)
- [ ] 짧은 영상 채널 - 유튜브 쇼츠, 인스타 릴스, 틱톡 (같은 영상 재사용, 쓰레드는 보조)
- [ ] 국내 커뮤니티 - GeekNews `Show GN`, 디스콰이엇, 인디스쿨(교사), 역사 커뮤니티

## 스레드 (Threads) - 오늘의 세계사

매일 밤 10시(한국 시간, 미국 동부 오전 9시) @today.worldhistory에 영어로 사건 하나를 공유 이미지 + 요약 + 상세 페이지 링크로 올린다. 스크립트 `scripts/threads/today.ts`, 예약 실행 `.github/workflows/threads-daily.yml`.
그날이 기념일인 사건(위키백과 첫 문단의 날짜)이 있으면 "N년 전 오늘", 없으면 중요한 사건을 돌아가며.

연결 순서:
1. 스레드 계정 만들기(인스타그램 계정으로 가입) - 프로필에 사이트 주소
2. developers.facebook.com → 앱 만들기 → 사용 사례 "Threads API 액세스" → 권한 `threads_basic`, `threads_content_publish`
3. 앱 역할 → 스레드 테스터에 새 계정 추가 → 스레드 앱 설정 → 웹사이트 권한 → 초대 수락
4. 사용자 토큰 만들기(그래프 API 탐색기 또는 OAuth) → 장기 토큰(60일)으로 바꾸기
5. GitHub 저장소 → Settings → Secrets → Actions → `THREADS_ACCESS_TOKEN`
6. Actions → Threads daily → Run workflow로 한 번 올려 보기
7. 50일쯤마다 `THREADS_ACCESS_TOKEN=… npm run threads -- --refresh` → 나온 새 토큰으로 Secret 교체

- 남의 글에 자동 댓글·좋아요·팔로우는 하지 않는다(스레드 정책). 가끔 직접 쓴 글을 섞는다.
- 미리 보기: `npm run threads -- --days 7`

## Reddit

### 계정
- 새 계정·카르마 적은 계정은 대부분 서브레딧에서 자동 삭제된다. 쓰던 계정을 쓰거나 1~2주 r/MapPorn, r/geography 등에 댓글로 카르마를 쌓는다.
- 홍보 글만 있는 계정은 스팸 취급. 평소 활동을 섞는다.

### 순서 (하루에 한 곳씩, 반응을 보면서)

| 순서 | 서브레딧 | 형식 | 메모 |
|---|---|---|---|
| 1 | r/SideProject | 링크 + 설명 | 홍보에 관대함. 첫 반응·버그 피드백 |
| 2 | r/InternetIsBeautiful | 사이트 링크 | 터지면 트래픽이 가장 큼 |
| 3 | r/MapPorn | 영상·GIF | 사이트 주소는 댓글로 |
| 4 | r/dataisbeautiful | 영상 + `[OC]` | 출처·도구를 댓글로 밝혀야 함 |
| 5 | r/webdev | 링크 | 토요일 "Showoff Saturday"에만 |

- r/history, r/AskHistorians는 홍보 금지 - 올리지 않는다.
- 올리기 직전에 각 서브레딧 사이드바 규칙을 다시 확인한다(자주 바뀜).

### 시간
- 한국 시간 밤 10시~새벽 1시(미국 아침), 화~목요일.
- 올린 뒤 1~2시간은 댓글에 바로 답할 수 있게 비워 둔다.

### 글 초안

**r/SideProject**
> **I built a free world history map: drag from 3400 BC to 2024 and watch borders change**
>
> Hi! I'm a solo developer from Korea. I always wanted one map where I could scrub through time and see what the world looked like, so I built this.
>
> - Borders from 3400 BC to 2024
> - 480+ historical events, 80+ war maps with battle-by-battle playback
> - Pandemic and invention spread maps
> - 8 languages, works on mobile, no sign-up
>
> Event texts are summarized from Wikipedia (CC BY-SA). Feedback welcome - especially if you spot historical errors.
>
> https://historymapworld.com/en

**r/InternetIsBeautiful**
> **An interactive world map - drag a slider through 5,400 years of history and watch borders change**

**r/MapPorn** (영상 글)
> **World borders from 3400 BC to 2024 [OC]**
>
> 댓글: "Made with my free interactive map - you can scrub through any year yourself: historymapworld.com/en"

### 반응이 올 때
- "이 국경 틀렸다" 같은 지적에는 고맙다고 답하고, 고친 뒤 "고쳤어요" 답글. 지적 내용은 바로 고친다.
- 지인에게 업보트 부탁 금지(조작으로 계정 정지). 광고 클릭 부탁도 금지(애드센스 정지).
