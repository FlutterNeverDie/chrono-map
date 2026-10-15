import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import "./globals.css";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_INFO,
  localeHref,
} from "@/i18n/locales";
import { getMessages } from "@/i18n";
import { NotFoundLocale } from "./NotFoundLocale";

/**
 * 없는 주소(404). 루트 레이아웃이 둘이라 레이아웃 없이 html 전체를 그린다(next.config의 globalNotFound).
 * 이동은 next/link 대신 <a>(사이트 규칙: 빌드 후 RSC 페이로드를 지우므로 클라이언트 이동을 쓰지 않음).
 * 정적 파일 하나라 기본은 한국어 제목 + 영어 설명이고, 각 언어 첫 화면 링크를 둔다.
 * 주소가 다른 언어(/en/…)로 시작하면 NotFoundLocale이 그 언어 문구(messages의 notFound)로 바꾸고 첫 화면 링크를 그 언어로 보낸다.
 */
export const metadata: Metadata = {
  // 탭 제목은 어느 언어에서나 읽히게 숫자만(정적 파일 하나라 언어별로 바꿀 수 없고, 하이드레이션 뒤 바꿔도 Next가 되돌린다)
  title: "404",
  robots: { index: false },
};

const texts = Object.fromEntries(
  LOCALES.map((l) => [l, getMessages(l).notFound]),
) as Record<Locale, ReturnType<typeof getMessages>["notFound"]>;
const { [DEFAULT_LOCALE]: ko, en } = texts;

const themeScript = `(function(){try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}})()`;

export default function GlobalNotFound() {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
          <p className="text-sm font-semibold tracking-[0.06em] text-accent uppercase">
            404
          </p>
          <h1 id="nf-title" className="mt-3 text-3xl font-bold">
            {ko.title}
          </h1>
          <p id="nf-sub" className="mt-2 text-lg text-muted">
            {en.body}
          </p>
          <a
            id="nf-home"
            href={localeHref(DEFAULT_LOCALE)}
            className="mt-8 inline-flex h-12 w-fit items-center rounded-md bg-foreground px-5 text-base font-semibold text-background"
          >
            {ko.home} · {en.home}
          </a>
          <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-base">
            {LOCALES.map((l) => (
              <li key={l}>
                <a
                  href={localeHref(l)}
                  className="text-muted underline hover:text-foreground"
                >
                  {LOCALE_INFO[l].nativeName}
                </a>
              </li>
            ))}
          </ul>
          <NotFoundLocale texts={texts} />
        </main>
      </body>
    </html>
  );
}
