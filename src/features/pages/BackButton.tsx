"use client";

import { ChevronLeftIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";

/** 상단 바 뒤로가기: 이 사이트에서 왔으면 브라우저 뒤로, 바로 들어왔으면(검색·공유 링크) 지도 첫 화면으로 */
export function BackButton() {
  const { locale, messages } = useI18n();
  const home = localeHref(locale);
  return (
    <a
      href={home}
      aria-label={messages.pages.back}
      title={messages.pages.back}
      onClick={(e) => {
        let sameSite = false;
        try {
          sameSite = new URL(document.referrer).origin === location.origin;
        } catch {}
        if (sameSite && history.length > 1) {
          e.preventDefault();
          history.back();
        }
      }}
      className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-chip hover:text-foreground"
    >
      <ChevronLeftIcon className="size-6 rtl:rotate-180" />
    </a>
  );
}
