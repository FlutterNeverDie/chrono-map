"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSelect } from "@/i18n/LanguageSelect";
import { localeHref, localePath } from "@/i18n/locales";
import { pick } from "@/lib/localize";
import topicIndex from "@/data/generated/topic-index.json";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ChevronDownIcon } from "@/components/ui/icons";

/** "chronomap" | "wars" | "map:<주제 지도 id>" */
export type SiteSection = string;

type MapLink = { section: SiteSection; href: string; label: string };

/**
 * 모든 지도 화면이 같이 쓰는 상단 바.
 * - 데스크톱(lg~): [지도 탭들] [화면별 도구(children)] [언어·테마]
 * - 모바일: [현재 지도 ▾ … 언어·테마] 한 줄 + 도구 한 줄. 지도 탭을 다 펼치면 잘리고 세 줄로 접혀
 *   화면 위쪽 40%를 가려서, 지도 고르기는 펼침 메뉴로 접는다(링크는 늘 HTML에 있어 검색 로봇도 따라간다).
 */
export function SiteHeader({
  current,
  children,
}: {
  current: SiteSection;
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
      {/* 모바일 한 줄: 지도 고르기 + 언어·테마 */}
      <div className="pointer-events-auto flex h-12 items-center gap-0.5 rounded-lg border border-line bg-surface/95 px-1 backdrop-blur lg:hidden">
        <MapMenu links={links} current={current} />
        <div className="ms-auto flex items-center gap-0.5">{settings}</div>
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
        <div className="pointer-events-auto w-full min-w-0 lg:w-auto lg:max-w-[calc(100%-36rem)] xl:max-w-[calc(100%-40rem)]">
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

/** 모바일 지도 고르기: 지금 지도 이름 ▾ → 펼치면 지도 목록(바깥을 누르거나 Esc로 닫힘) */
function MapMenu({
  links,
  current,
}: {
  links: MapLink[];
  current: SiteSection;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const here = links.find((l) => l.section === current) ?? links[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 max-w-full items-center gap-1.5 rounded-md px-3 text-base font-bold whitespace-nowrap hover:bg-chip"
      >
        <span className="truncate">{here.label}</span>
        <ChevronDownIcon
          className={clsx(
            "size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <ul
        className={clsx(
          "absolute start-0 top-12 z-40 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-lg",
          !open && "hidden",
        )}
      >
        {links.map((l) => (
          <li key={l.section}>
            <a
              href={l.href}
              aria-current={current === l.section ? "page" : undefined}
              className={clsx(
                "flex h-12 items-center rounded-md px-3 text-base whitespace-nowrap",
                current === l.section ? "bg-chip font-bold" : "hover:bg-chip",
              )}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
