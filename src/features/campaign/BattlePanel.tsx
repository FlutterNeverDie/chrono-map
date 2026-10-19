"use client";

import type { ReactNode } from "react";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";
import { ChevronUpIcon, XIcon } from "@/components/ui/icons";
import { WikiCredit } from "@/components/ui/WikiCredit";
import { withAd } from "@/components/ui/withAd";
import { CardSummary } from "@/components/ui/CardSummary";
import { useCampaign, useCampaignState } from "./store";
import {
  battleSummary,
  battleTitle,
  battlesAt,
  campaignSummary,
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
/** ad: 전투 카드 사이에 넣을 광고(3번째 뒤) — app이 넘긴다 */
export function BattlePanel({ ad }: { ad?: ReactNode } = {}) {
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
  const war = campaignSummary(c, locale);

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
          // 휴대폰은 아래 연도 말풍선이 목록 끝을 가려서, 끝까지 내렸을 때 마지막 줄(출처)이 그 위로 오게 여백
          "overflow-y-auto overscroll-contain px-3 pb-10 lg:pb-3",
          open ? "min-h-0 flex-1" : "hidden",
          "lg:block lg:max-h-none lg:flex-1",
        )}
      >
        {war.text && tab === "now" && (
          <div className="mb-3 rounded-lg bg-chip/60 p-4">
            <h2 className="text-lg font-bold lg:text-2xl">
              {campaignTitle(c, locale)}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {formatRange(c.start, c.end, c.unit, locale)}
            </p>
            <CardSummary
              text={war.text}
              lang={war.lang}
              href={localeHref(locale, `wars/${c.id}/about`)}
              moreLabel={messages.ui.details}
              source={
                war.page ? `${messages.ui.wikipedia} · CC BY-SA 4.0` : undefined
              }
              className="mt-2 text-[15px] text-muted lg:text-lg"
            />
          </div>
        )}
        {list.length === 0 && (
          <p className="px-1 py-2 text-base text-muted">
            {messages.wars.noBattles}
          </p>
        )}
        <ol className="space-y-3">
          {withAd(
            list.map((b) => {
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
                    <CardSummary
                      text={summary.text}
                      lang={summary.lang}
                      lines={3}
                      href={localeHref(
                        locale,
                        `wars/${c.id}/about#battle-${b.id}`,
                      )}
                      moreLabel={messages.ui.details}
                      source={
                        summary.page
                          ? `${messages.ui.wikipedia} · CC BY-SA 4.0`
                          : undefined
                      }
                      className="mt-2 text-base text-muted lg:text-lg xl:text-[19px]"
                    />
                  </article>
                </li>
              );
            }),
            ad,
          )}
        </ol>
        {/* 출처는 카드마다가 아니라 목록 끝에 한 번(문서별 원문 링크는 상세 페이지) */}
        <WikiCredit
          show={!!war.page || list.some((b) => battleSummary(b, locale).page)}
          from={messages.ui.creditFrom}
          wikipedia={messages.ui.wikipedia}
          wikipediaHome={`https://${locale}.wikipedia.org/`}
          note={messages.ui.creditNote}
        />
      </div>
    </section>
  );
}
