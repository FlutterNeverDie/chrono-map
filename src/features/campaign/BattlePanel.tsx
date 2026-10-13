"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronUpIcon, XIcon } from "@/components/ui/icons";
import { WikiLink } from "@/components/ui/WikiLink";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { useCampaign, useCampaignState } from "./store";
import {
  battleSummary,
  battleTitle,
  battlesAt,
  campaignTitle,
  formatRange,
  formatTime,
} from "./logic";
import type { Battle } from "./types";

/**
 * 전투 목록 (모바일: 하단 시트, 데스크톱: 오른쪽 패널).
 * "이 시기" = 슬라이더가 가리키는 때의 전투(중요한 순), "전체 전투" = 전쟁 전체를 시간 순으로.
 * 전체 목록에서 전투를 고르면 슬라이더도 그 시점으로 옮긴다.
 */
export function BattlePanel() {
  const { locale, messages } = useI18n();
  const c = useCampaign();
  const t = useCampaignState((s) => s.t);
  const setT = useCampaignState((s) => s.setT);
  const selected = useCampaignState((s) => s.selectedBattle);
  const selectBattle = useCampaignState((s) => s.selectBattle);
  const focusOn = useCampaignState((s) => s.focusOn);
  const open = useCampaignState((s) => s.panelOpen);
  const setOpen = useCampaignState((s) => s.setPanelOpen);
  const [tab, setTab] = useState<"now" | "all">("now");
  const now = useMemo(() => battlesAt(c, t), [c, t]);
  const list = tab === "now" ? now : c.battles;
  const war = c.wiki[locale] ?? c.wiki.en;

  useEffect(() => {
    if (selected)
      document
        .getElementById(`battle-${selected}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected, tab]);

  const choose = (b: Battle) => {
    if (tab === "all") setT(b.start);
    selectBattle(b.id);
    focusOn(b.coords);
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
      aria-label={messages.wars.battles}
      className={clsx(
        "pointer-events-auto absolute inset-x-2 bottom-[calc(var(--bar-h)+0.5rem)] z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-background/95 shadow-lg backdrop-blur lg:inset-x-auto lg:end-3 lg:top-[4.75rem] lg:w-[34rem] xl:w-[40rem] 2xl:w-[46rem]",
        // 모바일에서 펼치면 위 끝을 화면 40% 지점에(지도가 위에 보이게), 키 작은 기기에서도 상단 바(--top-h) 아래로
        open && "max-lg:top-[max(calc(var(--top-h)+0.5rem),40dvh)]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-14 shrink-0 items-center justify-between px-5 text-lg font-bold lg:pointer-events-none lg:h-16 lg:text-2xl"
      >
        <span className="truncate">
          {messages.wars.battles} ·{" "}
          {fill(messages.wars.battleCount, { n: now.length })}
          <span className="ms-2 text-base font-medium text-muted lg:text-xl">
            {formatTime(t, c.unit, locale)}
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
        className={clsx(
          "flex gap-1 px-3 pb-3",
          open ? "flex" : "hidden",
          "lg:flex",
        )}
      >
        {tabButton("now", messages.wars.now)}
        {tabButton(
          "all",
          `${messages.wars.all} · ${fill(messages.wars.battleCount, { n: c.battles.length })}`,
        )}
      </div>
      <div
        className={clsx(
          "overflow-y-auto overscroll-contain px-3 pb-3",
          open ? "min-h-0 flex-1" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        {war && tab === "now" && (
          <div className="mb-3 rounded-lg bg-chip/60 p-4">
            <h2 className="text-lg font-bold lg:text-2xl">
              {campaignTitle(c, locale)}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {formatRange(c.start, c.end, c.unit, locale)}
            </p>
            <ExpandableText
              text={war.extract}
              moreLabel={messages.ui.details}
              lessLabel={messages.ui.collapse}
              className="mt-2 text-[15px] text-muted lg:text-lg"
              trailing={
                <WikiLink
                  href={war.url}
                  label={messages.ui.readMore}
                  source={`${messages.ui.wikipedia} · CC BY-SA 4.0`}
                />
              }
            />
          </div>
        )}
        {list.length === 0 && (
          <p className="px-1 py-2 text-base text-muted">
            {messages.wars.noBattles}
          </p>
        )}
        <ol className="space-y-3">
          {list.map((b) => {
            const summary = battleSummary(b, locale);
            const on = b.id === selected;
            return (
              <li key={b.id} id={`battle-${b.id}`}>
                <article
                  onClick={() => choose(b)}
                  className={clsx(
                    "cursor-pointer rounded-lg border bg-surface p-5 transition-colors",
                    on
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-line hover:border-muted/50",
                  )}
                >
                  <p className="text-[15px] text-muted">
                    {formatRange(b.start, b.end, c.unit, locale)}
                  </p>
                  <h3 className="mt-1.5 text-xl leading-snug font-bold lg:text-2xl xl:text-[26px]">
                    {battleTitle(b, locale)}
                  </h3>
                  {summary.text && (
                    <ExpandableText
                      text={summary.text}
                      lang={summary.lang}
                      lines={3}
                      moreLabel={messages.ui.details}
                      lessLabel={messages.ui.collapse}
                      className="mt-2 text-base text-muted lg:text-lg xl:text-[19px]"
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
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
