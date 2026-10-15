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
import { ShareButton } from "@/components/ui/ShareButton";
import { NamesToggle } from "@/components/ui/NamesToggle";
import { ContactMenu } from "./ContactMenu";
import {
  BookIcon,
  BulbIcon,
  ChevronUpIcon,
  GearIcon,
  MapIcon,
  SwordsIcon,
  TempleIcon,
  VirusIcon,
} from "@/components/ui/icons";

/** "chronomap" | "wars" | "map:<주제 지도 id>" */
export type SiteSection = string;

/** 주제 지도 아이콘(topic.txt의 icon). 없는 이름은 지도 아이콘 */
const MAP_ICONS: Record<string, typeof MapIcon> = {
  virus: VirusIcon,
  bulb: BulbIcon,
  temple: TempleIcon,
  map: MapIcon,
};

/**
 * 모든 지도 화면의 하단 바: [지도 고르기(지금 지도 아이콘 → 위로 목록)] [시간 슬라이더(children)] [설정 ⚙ → 언어·테마·나라 이름·(지도별 설정)·사용 설명서·공유·문의 메일·소개/개인정보].
 * 데스크톱(lg~)은 한 줄, 모바일은 슬라이더 한 줄 + [지도 … 설정] 한 줄
 * (한 줄에 다 넣으면 좁은 폰에서 슬라이더가 50px 남짓으로 줄어 조작이 어렵다).
 * 높이는 화면 루트의 --bar-h(모바일 6.3rem, lg 5.75rem + safe-area)와 맞춘다.
 */
export function BottomBar({
  current,
  settings,
  children,
}: {
  current: SiteSection;
  /** 그 지도에만 있는 설정(본 지도의 연도 단위 등). 언어·테마 아래에 들어간다 */
  settings?: ReactNode;
  children: ReactNode;
}) {
  const { locale, messages } = useI18n();
  const maps = [
    {
      section: "chronomap",
      href: localePath(locale),
      label: messages.siteName,
      Icon: MapIcon,
    },
    {
      section: "wars",
      href: localeHref(locale, "wars"),
      label: messages.wars.tab,
      Icon: SwordsIcon,
    },
    // 주제 지도: content/topics에 지도를 추가하면 자동으로 늘어난다
    ...(
      topicIndex as {
        id: string;
        icon?: string;
        title: Record<string, string>;
      }[]
    ).map((t) => ({
      section: `map:${t.id}`,
      href: localeHref(locale, `maps/${t.id}`),
      label: pick(t.title, locale),
      Icon: MAP_ICONS[t.icon ?? "map"] ?? MapIcon,
    })),
  ];
  const here = maps.find((m) => m.section === current) ?? maps[0];

  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 flex h-[var(--bar-h)] flex-col border-t border-line bg-surface px-2 pt-1 pb-[env(safe-area-inset-bottom)] sm:px-4 lg:flex-row lg:pt-3 lg:items-start lg:gap-2">
      {/* 시간 슬라이더 — 모바일 첫 줄, 데스크톱 가운데 */}
      <div className="min-w-0 lg:order-2 lg:flex-1">{children}</div>

      {/* 모바일은 이 줄에 [지도 … 설정], 데스크톱은 lg:contents로 슬라이더 양옆에 */}
      <div className="mt-auto mb-0.5 flex items-center justify-between lg:contents">
        {/* 지도 고르기: 지금 지도 아이콘 → 위로 펼쳐지는 목록(아이콘 + 이름) */}
        <div className="lg:order-1">
          <Popover
            label={here.label}
            side="top"
            button={
              <>
                <here.Icon className="size-[22px]" />
                <ChevronUpIcon className="size-4 text-muted" />
              </>
            }
          >
            {() => (
              <ul>
                {maps.map(({ section, href, label, Icon }) => (
                  <li key={section}>
                    <a
                      href={href}
                      aria-current={current === section ? "page" : undefined}
                      className={clsx(
                        "flex h-12 items-center gap-3 rounded-md px-3 text-base whitespace-nowrap",
                        current === section
                          ? "bg-chip font-bold"
                          : "hover:bg-chip",
                      )}
                    >
                      <Icon className="size-[22px] shrink-0" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Popover>
        </div>
        <div className="lg:order-3">
          <Popover
            label={messages.ui.settings}
            align="end"
            side="top"
            button={<GearIcon className="size-[22px] text-muted" />}
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
                <NamesToggle
                  hideLabel={messages.ui.hideNames}
                  showLabel={messages.ui.showNames}
                />
                {settings}
                <a
                  href={localeHref(locale, "guide")}
                  className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-base text-foreground hover:bg-chip"
                >
                  <BookIcon className="size-[22px] shrink-0 text-muted" />
                  {messages.pages.guide}
                </a>
                <ShareButton
                  label={messages.ui.share}
                  copiedLabel={messages.ui.linkCopied}
                />
                {/* 문의: 주소 복사·Gmail·메일 앱(ContactMenu) */}
                <ContactMenu />
                {/* 소개·개인정보처리방침(애드센스 심사에도 필요한 글) — 작은 글자 한 줄 */}
                <p className="mt-1 flex gap-1 border-t border-line px-1 pt-1 text-sm text-muted">
                  <a
                    href={localeHref(locale, "about")}
                    className="flex h-11 items-center rounded-md px-2 hover:bg-chip hover:text-foreground"
                  >
                    {messages.pages.about}
                  </a>
                  <a
                    href={localeHref(locale, "privacy")}
                    className="flex h-11 items-center rounded-md px-2 hover:bg-chip hover:text-foreground"
                  >
                    {messages.pages.privacy}
                  </a>
                </p>
              </div>
            )}
          </Popover>
        </div>
      </div>
    </nav>
  );
}
