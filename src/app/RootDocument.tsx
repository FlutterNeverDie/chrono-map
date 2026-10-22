import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { Locale } from "@/lib/types";
import { LOCALE_INFO } from "@/i18n/locales";
import { AdsScript } from "@/features/ads";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** 저장된 테마·나라 이름 숨김만 적용. 저장값이 없으면 일반(light), 이름 보임이 기본 */
const themeScript = `(function(){try{var d=document.documentElement;if(localStorage.getItem("theme")==="dark")d.dataset.theme="dark";if(localStorage.getItem("names")==="off")d.dataset.names="off";if(localStorage.getItem("pins")==="off")d.dataset.pins="off"}catch(e){}})()`;

/** 두 루트 레이아웃((home) = 한국어 `/`, [locale] = 나머지 언어)이 공유하는 html 뼈대 */
export function RootDocument({
  locale,
  headScript,
  children,
}: {
  locale: Locale;
  headScript?: string;
  children: ReactNode;
}) {
  return (
    <html
      lang={locale}
      dir={LOCALE_INFO[locale].dir}
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <AdsScript />
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {headScript && (
          <Script id="locale-redirect" strategy="beforeInteractive">
            {headScript}
          </Script>
        )}
      </body>
    </html>
  );
}
