"use client";

import type { ReactNode } from "react";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";
import { pick } from "@/lib/localize";
import { ChevronUpIcon, XIcon } from "@/components/ui/icons";
import { WikiLink } from "@/components/ui/WikiLink";
import { withAd } from "@/components/ui/withAd";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { PageLink } from "@/components/ui/PageLink";
import { useTopic, useTopicState } from "./store";
import {
  currentItems,
  formatItemWhen,
  formatT,
  itemSummary,
  itemTitle,
  itemColor,
} from "./logic";
import type { TopicItem } from "./types";

/** 항목 목록: "이 시기"(진행 중이거나 최근 등장) / "전체"(시간 순, 고르면 그 시점으로 이동) */
/** ad: 항목 카드 사이에 넣을 광고(3번째 뒤) — app이 넘긴다 */
export function TopicPanel({ ad }: { ad?: ReactNode } = {}) {
  const { locale, messages } = useI18n();
  const topic = useTopic();
  const t = useTopicState((s) => s.t);
  const setT = useTopicState((s) => s.setT);
  const selected = useTopicState((s) => s.selected);
  const select = useTopicState((s) => s.select);
  const focusOn = useTopicState((s) => s.focusOn);
  const open = useTopicState((s) => s.panelOpen);
  const setOpen = useTopicState((s) => s.setPanelOpen);
  const [tab, setTab] = useState<"now" | "all">("now");
  const now = useMemo(() => currentItems(topic, t), [topic, t]);
  const list = tab === "now" ? now : topic.items;

  useEffect(() => {
    if (selected)
      document
        .getElementById(`item-${selected}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected, tab]);

  const choose = (it: TopicItem) => {
    if (tab === "all" || it.start > t) setT(it.start);
    select(it.id);
    focusOn(it.coords);
  };
  const tabButton = (id: "now" | "all", label: string) => (
    <button
      type="button"
      aria-pressed={tab === id}
      onClick={() => setTab(id)}
      className={clsx(
        "h-9 rounded-md px-3 text-sm whitespace-nowrap transition-colors lg:h-10 lg:text-base",
        tab === id
          ? "bg-foreground font-semibold text-background"
          : "text-muted hover:bg-chip hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <section
      data-map-overlay
      aria-label={messages.maps.now}
      className={clsx(
        "pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg backdrop-blur lg:inset-x-auto lg:end-3 lg:top-3 lg:w-[34rem] xl:w-[40rem] 2xl:w-[46rem]",
        // 모바일에서 펼치면 위 끝을 화면 25% 지점에(지도가 위에 보이게), 키 작은 기기에서도 상단 바(--top-h) 아래로
        open && "max-lg:top-[max(calc(var(--top-h)+0.5rem),25dvh)]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-14 shrink-0 items-center justify-between px-5 text-lg font-bold lg:pointer-events-none lg:h-16 lg:text-2xl"
      >
        <span className="truncate">
          {topic.mode === "persist" ? messages.maps.latest : messages.maps.now}{" "}
          · {fill(messages.maps.count, { n: now.length })}
          <span className="ms-2 text-base font-medium text-muted lg:text-xl">
            {formatT(t, topic, locale)}
          </span>
        </span>
        <span aria-hidden className="text-muted lg:hidden">
          {open ? (
            <XIcon className="size-6" />
          ) : (
            <ChevronUpIcon className="size-6" />
          )}
        </span>
      </button>
      <div
        className={clsx("gap-1 px-3 pb-3", open ? "flex" : "hidden", "lg:flex")}
      >
        {tabButton(
          "now",
          topic.mode === "persist" ? messages.maps.latest : messages.maps.now,
        )}
        {tabButton(
          "all",
          `${messages.maps.all} · ${fill(messages.maps.count, { n: topic.items.length })}`,
        )}
      </div>
      <div
        className={clsx(
          "overflow-y-auto overscroll-contain px-3 pb-3",
          open ? "min-h-0 flex-1" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        {list.length === 0 && (
          <p className="px-1 py-2 text-base text-muted lg:text-lg">
            {messages.maps.empty}
          </p>
        )}
        <ol className="space-y-3">
          {withAd(
            list.map((it) => {
              const summary = itemSummary(it, locale);
              const on = it.id === selected;
              return (
                <li key={it.id} id={`item-${it.id}`}>
                  <article
                    onClick={() => choose(it)}
                    className={clsx(
                      "cursor-pointer rounded-lg border bg-surface p-5 transition-colors",
                      on
                        ? "border-accent ring-2 ring-accent/30"
                        : "border-line hover:border-muted/50",
                    )}
                  >
                    <p className="flex items-center gap-2 text-[15px] text-muted lg:text-base">
                      <span
                        aria-hidden
                        className="size-3 rounded-full"
                        style={{ backgroundColor: itemColor(topic, it.id) }}
                      />
                      {formatItemWhen(it, topic, locale)}
                    </p>
                    <h3 className="mt-1.5 text-xl leading-snug font-bold lg:text-2xl xl:text-[26px]">
                      {itemTitle(it, locale)}
                    </h3>
                    {summary.text && (
                      <ExpandableText
                        text={summary.text}
                        lang={summary.lang}
                        lines={3}
                        moreLabel={messages.ui.details}
                        lessLabel={messages.ui.collapse}
                        className="mt-2 text-base text-muted lg:text-lg xl:text-[19px]"
                        expanded={
                          <PageLink
                            href={localeHref(
                              locale,
                              it.page ?? `maps/${topic.id}/${it.id}`,
                            )}
                            label={messages.ui.detailPage}
                          />
                        }
                        trailing={
                          summary.page && (
                            <WikiLink
                              href={summary.page.url}
                              label={messages.ui.readMore}
                              source={`${messages.ui.wikipedia} · CC BY-SA 4.0`}
                            />
                          )
                        }
                      />
                    )}
                    {it.link && (
                      <a
                        href={localeHref(locale, it.link)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex h-11 items-center rounded-md bg-foreground px-4 text-base font-semibold text-background"
                      >
                        {pick(topic.linkLabel ?? {}, locale)}
                      </a>
                    )}
                  </article>
                </li>
              );
            }),
            ad,
          )}
        </ol>
      </div>
    </section>
  );
}
