"use client";

import { ChevronDownIcon, GlobeIcon } from "@/components/ui/icons";
import { useI18n } from "./I18nProvider";
import { LOCALES, LOCALE_INFO, isLocale, localePath } from "./locales";

/**
 * 언어 선택. 보이는 부분은 아이콘 + 언어 이름이고, 실제 선택은 그 위에 겹친 투명한
 * 기본 <select>가 받는다(모바일에서 기기 기본 선택창이 뜬다).
 * 고른 언어는 저장해 두고 `/` 접속 시 그 언어로 보낸다.
 */
export function LanguageSelect() {
  const { locale, messages } = useI18n();

  return (
    <label className="relative flex h-12 items-center gap-2 rounded-md px-3 text-base text-muted transition-colors focus-within:ring-2 focus-within:ring-accent/40 hover:bg-chip hover:text-foreground">
      <GlobeIcon className="size-[22px] shrink-0" />
      <span className="font-medium text-foreground uppercase sm:hidden">
        {locale}
      </span>
      <span className="hidden font-medium text-foreground sm:inline">
        {LOCALE_INFO[locale].nativeName}
      </span>
      <ChevronDownIcon className="size-4 shrink-0" />
      <select
        aria-label={messages.ui.language}
        value={locale}
        onChange={(e) => {
          const next = e.target.value;
          if (!isLocale(next)) return;
          try {
            localStorage.setItem("locale", next);
          } catch {}
          window.location.assign(localePath(next));
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
