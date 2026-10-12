"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSelect } from "@/i18n/LanguageSelect";
import { localeHref, localePath } from "@/i18n/locales";
import { pick } from "@/lib/localize";
import topicIndex from "@/data/generated/topic-index.json";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** "chronomap" | "wars" | "map:<주제 지도 id>" */
export type SiteSection = string;

/**
 * 모든 지도 화면이 같이 쓰는 상단 바.
 * 왼쪽: 지도 탭(크로노맵 / 전쟁 지도 / 주제 지도들 — 누르면 바로 그 지도로) · 가운데: 화면별 도구(children) · 오른쪽: 언어·테마 설정
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
  const tabClass = (on: boolean) =>
    clsx(
      "flex h-10 items-center rounded-md px-3 text-[15px] whitespace-nowrap transition-colors",
      on
        ? "font-bold text-foreground"
        : "text-muted hover:bg-chip hover:text-foreground",
    );

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start gap-2 p-3 lg:flex-nowrap lg:gap-3">
      <nav className="pointer-events-auto flex h-12 max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface/95 p-1 backdrop-blur [scrollbar-width:none] max-lg:max-w-[calc(100%-9.5rem)]">
        <a
          href={localePath(locale)}
          aria-current={current === "chronomap" ? "page" : undefined}
          className={tabClass(current === "chronomap")}
        >
          {messages.siteName}
        </a>
        {/* 전쟁 지도: 모든 전쟁이 보이는 지도(/wars) → 전쟁을 골라 그 전쟁 지도로 */}
        <a
          href={localeHref(locale, "wars")}
          aria-current={current === "wars" ? "page" : undefined}
          className={tabClass(current === "wars")}
        >
          {messages.wars.tab}
        </a>
        {/* 주제 지도 탭: content/topics에 지도를 추가하면 자동으로 늘어난다 */}
        {(topicIndex as { id: string; title: Record<string, string> }[]).map(
          (t) => (
            <a
              key={t.id}
              href={localeHref(locale, `maps/${t.id}`)}
              aria-current={current === `map:${t.id}` ? "page" : undefined}
              className={tabClass(current === `map:${t.id}`)}
            >
              {pick(t.title, locale)}
            </a>
          ),
        )}
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
