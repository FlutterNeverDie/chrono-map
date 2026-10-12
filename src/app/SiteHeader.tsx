"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSelect } from "@/i18n/LanguageSelect";
import { localePath } from "@/i18n/locales";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export type SiteSection = "chronomap" | "ww2";

/**
 * 모든 지도 화면이 같이 쓰는 상단 바.
 * 왼쪽: 지도 전환 탭(크로노맵 / 2차 세계대전) · 가운데: 화면별 도구(children) · 오른쪽: 언어·테마 설정
 * 모바일은 [탭 | 설정] 한 줄 + 도구 한 줄.
 */
export function SiteHeader({
  current,
  children,
}: {
  current: SiteSection;
  children?: ReactNode;
}) {
  const { locale, messages } = useI18n();
  const base = localePath(locale);
  const tabs: { id: SiteSection; label: string; href: string }[] = [
    { id: "chronomap", label: messages.siteName, href: base },
    {
      id: "ww2",
      label: messages.ww2.tab,
      href: `${base === "/" ? "" : base}/ww2`,
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start gap-2 p-3 lg:flex-nowrap lg:gap-3">
      <nav className="pointer-events-auto flex h-12 shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface/95 p-1 backdrop-blur">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
            aria-current={tab.id === current ? "page" : undefined}
            className={clsx(
              "flex h-10 items-center rounded-md px-3 text-[15px] whitespace-nowrap transition-colors",
              tab.id === current
                ? "font-bold text-foreground"
                : "text-muted hover:bg-chip hover:text-foreground",
            )}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <div className="pointer-events-auto order-last w-full min-w-0 lg:order-none lg:w-auto lg:max-w-[calc(100%-36rem)] xl:max-w-[calc(100%-40rem)]">
        {children}
      </div>

      <div className="pointer-events-auto ms-auto flex h-12 shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface/95 px-1 backdrop-blur">
        <LanguageSelect />
        <span aria-hidden className="h-6 w-px bg-line" />
        <ThemeToggle
          toDarkLabel={messages.ui.toDark}
          toLightLabel={messages.ui.toLight}
        />
      </div>
    </div>
  );
}
