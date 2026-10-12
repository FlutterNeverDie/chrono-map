"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
} from "@/components/ui/icons";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { useTopic, useTopicState } from "./store";
import {
  currentItems,
  formatItemWhen,
  formatT,
  itemSummary,
  itemTitle,
} from "./logic";
import type { TopicItem } from "./types";

/** 항목 목록: "이 시기"(진행 중이거나 최근 등장) / "전체"(시간 순, 고르면 그 시점으로 이동) */
export function TopicPanel() {
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
      className="pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg backdrop-blur lg:inset-x-auto lg:end-3 lg:top-[4.75rem] lg:w-[34rem] xl:w-[40rem] 2xl:w-[46rem]"
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
            <ChevronDownIcon className="size-6" />
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
          open ? "max-h-[52dvh]" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        {list.length === 0 && (
          <p className="px-1 py-2 text-base text-muted lg:text-lg">
            {messages.maps.empty}
          </p>
        )}
        <ol className="space-y-3">
          {list.map((it) => {
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
                      style={{ backgroundColor: topic.color }}
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
                    />
                  )}
                  {summary.page && (
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-muted lg:text-[15px]">
                      <a
                        href={summary.page.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-line underline-offset-2"
                      >
                        {messages.ui.readMore}
                        <ExternalIcon className="size-4" />
                      </a>
                      <span>{messages.ui.wikipedia} · CC BY-SA 4.0</span>
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
