import type { ReactNode } from "react";
import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LanguageSelect } from "@/i18n/LanguageSelect";
import { localeHref } from "@/i18n/locales";
import { CC_BY_4, CC_BY_SA_4 } from "@/data/links";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BackButton } from "./BackButton";

/** 글 페이지(사건 상세·소개·개인정보처리방침) 공통 틀: 상단 바(뒤로·사이트 이름·언어·테마) + 본문 + 바닥글 */
export function PageShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const messages = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-10 border-b border-line bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center">
              <BackButton />
              <a
                href={localeHref(locale)}
                className="truncate text-[15px] font-bold sm:text-base sm:tracking-[0.06em] sm:uppercase"
              >
                {messages.siteName}
              </a>
            </div>
            <div className="flex items-center gap-0.5">
              <LanguageSelect />
              <ThemeToggle
                toDarkLabel={messages.ui.toDark}
                toLightLabel={messages.ui.toLight}
              />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
          {children}
        </main>
        <SiteFooter locale={locale} />
      </div>
    </I18nProvider>
  );
}

/** 바닥글: 연도별·사용 설명서·소개·연락처·개인정보처리방침 링크 + 데이터 출처 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-sm text-muted">
        <a href={localeHref(locale, "year")} className="hover:text-foreground">
          {messages.years.tab}
        </a>
        <a href={localeHref(locale, "guide")} className="hover:text-foreground">
          {messages.pages.guide}
        </a>
        <a href={localeHref(locale, "about")} className="hover:text-foreground">
          {messages.pages.about}
        </a>
        <a
          href={localeHref(locale, "contact")}
          className="hover:text-foreground"
        >
          {messages.pages.contactTitle}
        </a>
        <a
          href={localeHref(locale, "privacy")}
          className="hover:text-foreground"
        >
          {messages.pages.privacy}
        </a>
        {/* 라이선스 이름은 라이선스 원문으로 */}
        <span>
          {messages.ui.wikipedia} ·{" "}
          <a
            href={CC_BY_SA_4}
            target="_blank"
            rel="license noreferrer"
            className="hover:text-foreground"
          >
            CC BY-SA 4.0
          </a>{" "}
          · Cliopatria (Seshat) ·{" "}
          <a
            href={CC_BY_4}
            target="_blank"
            rel="license noreferrer"
            className="hover:text-foreground"
          >
            CC BY 4.0
          </a>
        </span>
      </div>
    </footer>
  );
}
