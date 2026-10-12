# 폴더 구조와 의존 방향

각 폴더의 `CLAUDE.md`가 그 모듈의 규칙이다. 해당 폴더 파일을 고치기 전에 반드시 읽는다.

```
content/               사람·AI가 편집하는 원본 데이터                       → content/CLAUDE.md
  events/ rankings/    본 지도 사건, 시점별 순서
  campaigns/<id>/      전쟁 지도 (설정·진영·전투)                         → content/campaigns/CLAUDE.md
  topics/<id>/         주제 지도 (역병·발명 … N개)                        → content/topics/CLAUDE.md
  polity-names/        지도 나라 이름 수정(언어별)
public/                생성된 정적 데이터 (git에 올림)
  borders/ campaigns/  연도별 국경 스냅샷, 언어별 나라 이름
  geo/                 확대 시 쓰는 자세한 해안선(50m)
src/
  app/                 라우트·화면 조립만                                 → src/app/CLAUDE.md
  i18n/                언어 목록·번역 사전·언어 선택                       → CLAUDE.md
  features/
    map/ timeline/ events/   본 지도(크로노맵)                            → 각 CLAUDE.md
    campaign/          전쟁 지도 (/wars/<id>)                             → CLAUDE.md
    topic/             주제 지도 (/maps/<id>)                             → CLAUDE.md
    pages/             글 페이지: 사건 상세·소개·개인정보처리방침             → CLAUDE.md
    ads/               AdSense (개발 완료 후)
  components/ui/       도메인을 모르는 공용 UI                             → CLAUDE.md
  components/map/      도메인을 모르는 지도 부품(뷰포트·국경 로더)            → CLAUDE.md
  store/  data/  lib/  전역 상태 · 정의·콘텐츠 진입점 · 순수 함수            → 각 CLAUDE.md
scripts/               데이터 변환(content·wiki·draft·borders, campaigns/, topics/, lib/ 공용)
docs/                  기획서(`기획서.md`, 기능 ID F-01 …), 규칙(`rules/`)
```

## 의존 방향

```
app → features → (i18n, store, lib, data, components/ui, components/map)
```

- features끼리 서로 import하지 않는다. 지도가 여러 종류(본 지도·전쟁·주제)라도 각자 독립. 공통 부품은 `components/`로, 공통 규칙은 `lib/`로 올린다.
- 생성된 JSON은 각 진입점(`data/content.ts`, `features/*/data.ts`)으로만 읽는다. `features/*/data.ts`는 **서버에서만** import하고, 클라이언트에는 그 페이지에 필요한 데이터만 props로 넘긴다(번들 크기).
- 정렬·필터 같은 규칙은 순수 함수(`lib/`, `features/*/logic.ts`)에 두고 컴포넌트는 그리기만 한다. lib은 React를 import하지 않는다.
- feature는 `index.ts`로 공개할 것만 export한다(서버 전용 `data.ts`·`meta.ts`는 경로로 직접 import).
