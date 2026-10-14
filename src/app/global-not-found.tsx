import type { Metadata } from "next";
import "./globals.css";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE, LOCALES, localeHref } from "@/i18n/locales";

/**
 * 없는 주소(404). 루트 레이아웃이 둘이라 레이아웃 없이 html 전체를 그린다(next.config의 globalNotFound).
 * 이동은 next/link 대신 <a>(사이트 규칙: 빌드 후 RSC 페이로드를 지우므로 클라이언트 이동을 쓰지 않음).
 * 주소로는 언어를 알 수 없어 한국어·영어를 함께 쓰고, 각 언어 첫 화면 링크를 둔다.
 */
export const metadata: Metadata = {
  title: "404 - 세계사 지도 History Map World",
  robots: { index: false },
};

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
          <h1 className="mt-3 text-3xl font-bold">페이지를 찾을 수 없습니다</h1>
          <p className="mt-2 text-lg text-muted">
            The page you are looking for does not exist.
          </p>
          <a
            href={localeHref(DEFAULT_LOCALE)}
            className="mt-8 inline-flex h-12 w-fit items-center rounded-md bg-foreground px-5 text-base font-semibold text-background"
          >
            세계사 지도 첫 화면으로 · Home
          </a>
          <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-base">
            {LOCALES.map((l) => (
              <li key={l}>
                <a
                  href={localeHref(l)}
                  className="text-muted underline hover:text-foreground"
                >
                  {getMessages(l).siteName} ({l})
                </a>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
