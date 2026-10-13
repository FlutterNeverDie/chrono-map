"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSelect } from "@/i18n/LanguageSelect";
import { localeHref, localePath } from "@/i18n/locales";
import { pick } from "@/lib/localize";
import topicIndex from "@/data/generated/topic-index.json";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Popover } from "@/components/ui/Popover";
import { ChevronDownIcon, SlidersIcon } from "@/components/ui/icons";

/** "chronomap" | "wars" | "map:<주제 지도 id>" */
export type SiteSection = string;

type MapLink = { section: SiteSection; href: string; label: string };

/**
 * 모든 지도 화면이 같이 쓰는 상단 바.
 * - 데스크톱(lg~): [지도 탭들] [화면별 도구(children)] [언어·테마]
 * - 모바일: [지금 지도 ▾] [mobileTool] … [설정 ⚙] 한 줄. 모두 펼침 메뉴라 지도를 가리지 않는다.
 *   mobileTool이 없으면 children(범례 등)을 둘째 줄에 둔다.
 *   (모바일에서 지도 탭·설정·시점 바를 다 펼치면 세 줄로 접혀 화면 위 40%를 가렸다)
 */
export function SiteHeader({
  current,
  mobileTool,
  children,
}: {
  current: SiteSection;
  /** 모바일 첫 줄에 넣을 작은 도구(예: 시점 고르기 메뉴). 있으면 모바일에서는 children을 숨긴다 */
  mobileTool?: ReactNode;
  children?: ReactNode;
}) {
  const { locale, messages } = useI18n();
  const links: MapLink[] = [
    {
      section: "chronomap",
      href: localePath(locale),
      label: messages.siteName,
    },
    // 전쟁 지도: 모든 전쟁이 보이는 지도(/wars) → 전쟁을 골라 그 전쟁 지도로
    {
      section: "wars",
      href: localeHref(locale, "wars"),
      label: messages.wars.tab,
    },
    // 주제 지도: content/topics에 지도를 추가하면 자동으로 늘어난다
    ...(topicIndex as { id: string; title: Record<string, string> }[]).map(
      (t) => ({
        section: `map:${t.id}`,
        href: localeHref(locale, `maps/${t.id}`),
        label: pick(t.title, locale),
      }),
    ),
  ];
  const here = links.find((l) => l.section === current) ?? links[0];
  const settings = (
    <>
      <LanguageSelect />
      <span aria-hidden className="h-6 w-px bg-line" />
      <ThemeToggle
        toDarkLabel={messages.ui.toDark}
        toLightLabel={messages.ui.toLight}
      />
    </>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:flex-row lg:items-start lg:gap-3 lg:p-3">
      {/* 모바일 한 줄: 지도 고르기 · 화면 도구 · 설정 */}
      <div className="pointer-events-auto flex h-12 items-center gap-0.5 rounded-lg border border-line bg-surface/95 px-1 backdrop-blur lg:hidden">
        <Popover
          button={
            <>
              <span className="truncate font-bold">{here.label}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted" />
            </>
          }
        >
          {() => (
            <ul>
              {links.map((l) => (
                <li key={l.section}>
                  <a
                    href={l.href}
                    aria-current={current === l.section ? "page" : undefined}
                    className={clsx(
                      "flex h-12 items-center rounded-md px-3 text-base whitespace-nowrap",
                      current === l.section
                        ? "bg-chip font-bold"
                        : "hover:bg-chip",
                    )}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Popover>
        {mobileTool && (
          <>
            <span aria-hidden className="h-6 w-px shrink-0 bg-line" />
            {mobileTool}
          </>
        )}
        <div className="ms-auto shrink-0">
          <Popover
            label={messages.ui.settings}
            align="end"
            button={<SlidersIcon className="size-[22px] text-muted" />}
          >
            {() => (
              // 한 줄씩 가득 — 아이콘 옆 여백을 눌러도 동작하게
              <div className="flex min-w-56 flex-col">
                <LanguageSelect wide />
                <ThemeToggle
                  wide
                  toDarkLabel={messages.ui.toDark}
                  toLightLabel={messages.ui.toLight}
                />
              </div>
            )}
          </Popover>
        </div>
      </div>

      {/* 데스크톱: 지도 탭 */}
      <nav className="pointer-events-auto hidden h-12 shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface/95 p-1 backdrop-blur lg:flex">
        {links.map((l) => (
          <a
            key={l.section}
            href={l.href}
            aria-current={current === l.section ? "page" : undefined}
            className={clsx(
              "flex h-10 items-center rounded-md px-3 text-[15px] whitespace-nowrap transition-colors",
              current === l.section
                ? "font-bold text-foreground"
                : "text-muted hover:bg-chip hover:text-foreground",
            )}
          >
            {l.label}
          </a>
        ))}
      </nav>

      {children && (
        <div
          className={clsx(
            "pointer-events-auto w-full min-w-0 lg:block lg:w-auto lg:max-w-[calc(100%-36rem)] xl:max-w-[calc(100%-40rem)]",
            mobileTool && "hidden",
          )}
        >
          {children}
        </div>
      )}

      {/* 데스크톱: 언어·테마 */}
      <div className="pointer-events-auto ms-auto hidden h-12 shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface/95 px-1 backdrop-blur lg:flex">
        {settings}
      </div>
    </div>
  );
}
