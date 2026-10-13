"use client";

import clsx from "clsx";
import { ChevronDownIcon, GlobeIcon } from "@/components/ui/icons";
import { useI18n } from "./I18nProvider";
import { LOCALES, LOCALE_INFO, isLocale, switchLocalePath } from "./locales";

/**
 * 언어 선택. 보이는 부분은 아이콘 + 언어 이름이고, 실제 선택은 그 위에 겹친 투명한
 * 기본 <select>가 받는다(모바일에서 기기 기본 선택창이 뜬다).
 * 고른 언어는 저장해 두고 `/` 접속 시 그 언어로 보낸다.
 */
/** wide: 한 줄 가득(모바일 설정 메뉴 — 줄 어디를 눌러도 선택창이 열린다) */
export function LanguageSelect({ wide = false }: { wide?: boolean }) {
  const { locale, messages } = useI18n();

  return (
    <label
      className={clsx(
        "relative flex items-center rounded-md text-muted transition-colors focus-within:ring-2 focus-within:ring-accent/40 hover:bg-chip hover:text-foreground",
        wide
          ? "h-12 w-full gap-3 px-3 text-base"
          : "h-10 gap-2 px-2.5 text-[15px]",
      )}
    >
      <GlobeIcon className="size-[22px] shrink-0" />
      {wide ? (
        <span className="font-medium text-foreground">
          {LOCALE_INFO[locale].nativeName}
        </span>
      ) : (
        <>
          <span className="font-medium text-foreground uppercase sm:hidden">
            {locale}
          </span>
          <span className="hidden font-medium text-foreground sm:inline">
            {LOCALE_INFO[locale].nativeName}
          </span>
        </>
      )}
      <ChevronDownIcon className={clsx("size-4 shrink-0", wide && "ms-auto")} />
      <select
        aria-label={messages.ui.language}
        value={locale}
        onChange={(e) => {
          const next = e.target.value;
          if (!isLocale(next)) return;
          try {
            localStorage.setItem("locale", next);
          } catch {}
          window.location.assign(
            switchLocalePath(window.location.pathname, locale, next) +
              window.location.search,
          );
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_INFO[l].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
