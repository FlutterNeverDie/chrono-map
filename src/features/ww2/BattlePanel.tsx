"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
} from "@/components/ui/icons";
import { useWw2 } from "./store";
import {
  battleSummary,
  battleTitle,
  battlesIn,
  formatMonth,
  formatMonthRange,
} from "./model";

/** 그 달에 진행 중인 전투 목록 (모바일: 하단 시트, 데스크톱: 오른쪽 패널) */
export function BattlePanel() {
  const { locale, messages } = useI18n();
  const month = useWw2((s) => s.month);
  const selected = useWw2((s) => s.selectedBattle);
  const selectBattle = useWw2((s) => s.selectBattle);
  const open = useWw2((s) => s.panelOpen);
  const setOpen = useWw2((s) => s.setPanelOpen);
  const battles = useMemo(() => battlesIn(month), [month]);

  useEffect(() => {
    if (selected)
      document
        .getElementById(`battle-${selected}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  return (
    <section
      aria-label={messages.ww2.battles}
      className="pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg backdrop-blur lg:inset-x-auto lg:end-3 lg:top-[4.75rem] lg:w-[32rem] xl:w-[36rem]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-14 shrink-0 items-center justify-between px-5 text-lg font-bold lg:pointer-events-none lg:h-16 lg:text-xl"
      >
        <span>
          {messages.ww2.battles} ·{" "}
          {fill(messages.ww2.battleCount, { n: battles.length })}
          <span className="ms-2 text-base font-medium text-muted lg:text-lg">
            {formatMonth(month, locale)}
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
        className={clsx(
          "overflow-y-auto overscroll-contain px-3 pb-3",
          open ? "max-h-[58dvh]" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        {battles.length === 0 && (
          <p className="px-1 py-2 text-base text-muted">
            {messages.ww2.noBattles}
          </p>
        )}
        <ol className="space-y-3">
          {battles.map((b) => {
            const summary = battleSummary(b, locale);
            const on = b.id === selected;
            return (
              <li key={b.id} id={`battle-${b.id}`}>
                <article
                  onClick={() => selectBattle(b.id)}
                  className={clsx(
                    "cursor-pointer rounded-lg border bg-surface p-5 transition-colors",
                    on
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-line hover:border-muted/50",
                  )}
                >
                  <p className="text-[15px] text-muted">
                    {formatMonthRange(b.start, b.end, locale)}
                  </p>
                  <h3 className="mt-1.5 text-xl leading-snug font-bold">
                    {battleTitle(b, locale)}
                  </h3>
                  {summary.text && (
                    <p
                      lang={summary.lang}
                      className={clsx(
                        "mt-1.5 text-base leading-relaxed text-muted",
                        !on && "line-clamp-3",
                      )}
                    >
                      {summary.text}
                    </p>
                  )}
                  {summary.page && (
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-muted">
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
