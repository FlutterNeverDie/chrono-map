# i18n — 다국어

## 언어

- 8개: 한국어(ko, 기본) + English(en), 中文(zh, 간체), Español(es), हिन्दी(hi), العربية(ar, RTL), Français(fr), Português(pt).
- 목록·표시명·방향(dir)은 `locales.ts`가 단일 출처. 언어를 추가하면 `lib/types.ts`의 `Locale`, `locales.ts`, `messages/`, `lib/year.ts`의 `FORMATS`, `scripts/build-borders.mjs`의 `LOCALES`(나라 이름)를 함께 고치고 `npm run borders`.

## 경로

- 한국어는 `/`, 나머지는 `/en`, `/zh` …(`localePath()`). 백엔드가 없으므로 Accept-Language 자동 감지는 하지 않는다.
- 언어를 고르면 localStorage(`locale`)에 저장하고 해당 경로로 이동. `/` 접속 시 저장된 언어가 한국어가 아니면 그 경로로 보낸다.

## 사전 (`messages/*.ts`)

- 기준은 `ko.ts`의 `Messages` 타입. 다른 언어 파일은 `Messages` 타입이라 키가 빠지면 타입 오류가 난다.
- 서버 컴포넌트는 `getMessages(locale)`, 클라이언트 컴포넌트는 `useI18n()`. 클라이언트에는 현재 언어 사전 하나만 넘어간다.
- 변수는 `{n}`, `{year}` 형식, 채우기는 `fill(template, vars)`.
- 함수·JSX는 사전에 넣지 않는다(서버 → 클라이언트 직렬화 불가). 연도 같은 형식 규칙은 `lib/`에 둔다.

## 번역 품질

- 지금 번역은 초안이다. 원어민 검수 전까지 영어 외 언어는 "검수 필요"로 본다.
- 고유명사(지명·인물)는 각 언어 위키백과 표기를 따른다.

## RTL (아랍어)

- `<html dir="rtl">`. 레이아웃은 논리 속성(`ms-`, `pe-`, `start-`, `end-`)으로 자동 반전된다.
- 연도 게이지와 지도는 방향을 뒤집지 않는다(`dir="ltr"` 고정).
