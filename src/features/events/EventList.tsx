"use client";

import type { ReactNode, RefObject } from "react";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePeriod } from "@/store/timeline";
import { useRankingViewpoint, useUi } from "@/store/ui";
import { groupTogether, isOngoing } from "@/lib/events";
import { useVisibleEvents } from "@/store/useVisibleEvents";
import { useRankings } from "@/store/events";
import { rankEvents } from "@/lib/ranking";
import { eventSummary, eventTitle, pick } from "@/lib/localize";
import { formatWhen } from "@/lib/year";
import { REGION_BY_ID } from "@/data/regions";
import { VIEWPOINT_BY_ID } from "@/data/viewpoints";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/i18n/locales";
import { PinIcon } from "@/components/ui/icons";
import { WikiCredit } from "@/components/ui/WikiCredit";
import { CardSummary } from "@/components/ui/CardSummary";
import { EventThumb } from "./EventPhoto";

/** 광고 칸 자리(이 수만큼 카드 뒤, 적으면 맨 끝) - components/ui/withAd와 같은 규칙 */
const AD_AFTER = 3;
/** 카드 높이 어림(그린 뒤 실제로 잰다), 카드 사이 간격(space-y-3) */
const CARD_H = 250;
const GAP = 12;

/** 선택 연도 주변 사건을 현재 시점 기준 중요한 순서로 나열 */
export function useRankedEvents() {
  const period = usePeriod();
  const visible = useVisibleEvents();
  const viewpoint = useRankingViewpoint();
  const rankings = useRankings();
  // 사는 곳 근처를 볼 때만 그 지역 사건을 먼저(다른 곳으로 끌면 그곳 기준)
  const home = useUi((s) =>
    s.home?.viewpoint === viewpoint ? s.home.region : null,
  );
  // 묶음 핀으로 골랐으면 그 사건들을 한 덩어리로(lib/events groupTogether)
  const group = useUi((s) => s.selectedGroup);
  return useMemo(
    () =>
      groupTogether(
        rankEvents(visible, {
          period,
          regionOrder: VIEWPOINT_BY_ID.get(viewpoint)!.regions,
          ranking: rankings[viewpoint] ?? [],
          home,
        }),
        group,
      ),
    [visible, period, viewpoint, rankings, home, group],
  );
}

/**
 * 사건 카드 목록. 화면(스크롤 상자 scroller)에 보이는 카드와 앞뒤 몇 장만 그린다(TanStack Virtual) - 몰린 시기에도
 * 카드 수백 장을 한꺼번에 만들지 않는다. 카드 높이는 그린 뒤 재서 맞춘다.
 * ad: 카드 사이에 넣을 광고(3번째 뒤) — app이 features/ads의 AdSlot을 넘긴다
 */
export function EventList({
  ad,
  scroller,
}: {
  ad?: ReactNode;
  scroller: RefObject<HTMLElement | null>;
}) {
  const { locale, messages } = useI18n();
  const period = usePeriod();
  const selectedEventId = useUi((s) => s.selectedEventId);
  const selectEvent = useUi((s) => s.selectEvent);
  const focusOn = useUi((s) => s.focusOn);
  const events = useRankedEvents();
  const adAt = ad ? Math.min(AD_AFTER, events.length) : -1;
  const rowCount = events.length + (ad ? 1 : 0);
  const eventAt = (row: number) =>
    adAt >= 0 && row > adAt ? events[row - 1] : events[row];
  const selectedIndex = events.findIndex((e) => e.id === selectedEventId);
  const selectedRow =
    selectedIndex < 0
      ? -1
      : selectedIndex + (adAt >= 0 && selectedIndex >= adAt ? 1 : 0);
  /** 고른 카드 줄(스크롤·높이 보정 처리기가 최신 값을 읽게) */
  const rowRef = useRef(selectedRow);
  // 그린 직후 바로(순서가 바뀐 뒤 높이를 다시 재는 처리기가 옛 줄 번호로 맞추지 않게)
  useLayoutEffect(() => {
    rowRef.current = selectedRow;
  });
  // 컴파일러 자동 메모를 이 컴포넌트에서 빼는 것뿐(라이브러리가 매번 새 값을 돌려줌) - 동작은 같다
  // eslint-disable-next-line react-hooks/incompatible-library
  const list = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scroller.current,
    estimateSize: () => CARD_H,
    gap: GAP,
    overscan: 3,
    // 서버 HTML·첫 그리기에도 앞의 카드 몇 장은 넣는다(검색 엔진·하이드레이션이 같은 결과)
    initialRect: { width: 400, height: 1000 },
    getItemKey: (row) => (row === adAt ? "__ad" : eventAt(row).id),
    // 카드 높이를 다시 재면(순서가 바뀐 뒤 새로 그린 카드 등) 고른 카드를 적어 둔 자리로 - 손으로 스크롤하는 중은 빼고
    onChange: () => holdRef.current(),
  });

  // 기간이 바뀌면 목록 맨 위로(고른 사건이 있으면 아래 효과가 그 카드로)
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [scroller, period.start]);
  // 사건을 고르면(핀·카드) 그 카드로 한 번 스크롤. 절반 시트(점을 탭해 연 모바일)는 카드를 목록 맨 위에 - 아래 끝은 연도 말풍선에 가려
  // "자세히" 줄이 잘린다. 고른 직후 지도가 그 점으로 옮겨 가며(1.5초 안) 순서가 바뀌면 애니메이션 없이 그 자리로 다시 맞춘다
  const half = useUi((s) => s.panelHalf);
  // 카드 높이를 재서 바뀌었을 때 스크롤 보정: 고른 카드가 있으면 그보다 위 카드일 때만(고른 카드가 제자리에) - 라이브러리 기본은
  // "지금 스크롤 위치보다 위" 기준이라, 핀을 눌러 시트가 막 열린 순간 옛 위치로 판단해 고른 카드가 236px 위로 밀렸다.
  // 없으면 기본과 같게. 옵션이 아니라 인스턴스 속성
  useLayoutEffect(() => {
    list.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, v) =>
      rowRef.current >= 0
        ? item.index < rowRef.current
        : item.start < (v.scrollOffset ?? 0) + v.scrollAdjustments;
  }, [list]);
  const chosen = useRef<{ id: string | null; at: number }>({ id: null, at: 0 });
  /**
   * 고른 카드와 스크롤 상자 위 끝 사이 거리 - 스크롤할 때마다 적어 둔다. 지도를 끌어(살짝 미끄러진 탭도) 시점별 정렬 순서가
   * 바뀌면 고른 카드가 같은 자리에 오게 스크롤을 바로 맞춘다 - 스크롤 값만 그대로 두면 그 아래 카드가 바뀌어 다른 사건이
   * 올라와 보였다(사용자 제보 2026-10-21). 고른 사건이 없으면 맞추지 않는다(새 지역의 중요한 순서를 그대로 보여 줌)
   */
  const anchor = useRef<{ id: string; offset: number } | null>(null);
  // 그 줄의 실제 위치(getOffsetForIndex는 목록 끝에서 스크롤 한계로 잘라 돌려준다)
  const startOf = (row: number) => list.measurementsCache[row]?.start;
  // 자리를 적는 때: 사용자가 직접 스크롤할 때(휠·손가락·키보드 뒤의 scroll)와 고른 직후 자리를 잡은 뒤(1.6초).
  // 순서가 바뀌며 목록이 스스로 움직인 scroll까지 적으면 밀린 자리가 굳어졌다
  const noteRef = useRef(() => {});
  const noteTimer = useRef(0);
  /** 사용자가 직접 스크롤하는 중(이 시각까지) - 그동안은 붙잡지 않는다 */
  const userUntil = useRef(0);
  useEffect(() => {
    noteRef.current = () => {
      const box = scroller.current;
      const start = rowRef.current >= 0 ? startOf(rowRef.current) : undefined;
      anchor.current =
        box && selectedEventId && start !== undefined
          ? { id: selectedEventId, offset: start - box.scrollTop }
          : null;
    };
  });
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const user = () => {
      userUntil.current = performance.now() + 400;
    };
    // 사용자 스크롤에 이어지는 scroll(손을 뗀 뒤 관성)도 사용자 것 - 이어지는 동안 기한을 늘린다
    const scroll = () => {
      const now = performance.now();
      if (now >= userUntil.current) return;
      userUntil.current = Math.max(userUntil.current, now + 150);
      noteRef.current();
    };
    const opts = { passive: true } as const;
    for (const t of [
      "wheel",
      "touchstart",
      "touchmove",
      "keydown",
      "pointerdown",
    ])
      box.addEventListener(t, user, opts);
    box.addEventListener("scroll", scroll, opts);
    return () => {
      for (const t of [
        "wheel",
        "touchstart",
        "touchmove",
        "keydown",
        "pointerdown",
      ])
        box.removeEventListener(t, user);
      box.removeEventListener("scroll", scroll);
    };
  }, [scroller]);
  /** 고른 카드를 적어 둔 자리(anchor)로 스크롤을 바로 맞춘다 */
  const pinRef = useRef(() => {});
  useEffect(() => {
    pinRef.current = () => {
      const box = scroller.current;
      const a = anchor.current;
      const row = rowRef.current;
      const start = a && row >= 0 ? startOf(row) : undefined;
      if (
        box &&
        a &&
        a.id === selectedEventId &&
        start !== undefined &&
        Math.abs(start - a.offset - box.scrollTop) > 1
      )
        box.scrollTop = start - a.offset;
    };
  });
  /**
   * 순서가 바뀌거나 높이를 다시 잰 뒤 0.5초 동안 매 프레임 고른 카드를 제자리에(광고 칸처럼 늦게 재지는 높이까지).
   * 사용자가 직접 스크롤하는 중이면 멈춘다
   */
  const holdUntil = useRef(0);
  const holdFrame = useRef(0);
  const holdRef = useRef(() => {});
  useEffect(() => {
    holdRef.current = () => {
      holdUntil.current = performance.now() + 500;
      if (holdFrame.current) return;
      const tick = () => {
        holdFrame.current = 0;
        if (performance.now() < userUntil.current) return;
        pinRef.current();
        if (performance.now() < holdUntil.current)
          holdFrame.current = requestAnimationFrame(tick);
      };
      holdFrame.current = requestAnimationFrame(tick);
    };
  });
  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box) return;
    if (selectedRow >= 0 && selectedEventId) {
      const first = chosen.current.id !== selectedEventId;
      if (first)
        chosen.current = { id: selectedEventId, at: performance.now() };
      if (first || performance.now() - chosen.current.at < 1500) {
        list.scrollToIndex(selectedRow, {
          align: half ? "start" : "auto",
          behavior: first ? "smooth" : "auto",
        });
        // 자리를 잡은 뒤 그 자리를 적는다(이후 순서가 바뀌어도 여기로)
        window.clearTimeout(noteTimer.current);
        noteTimer.current = window.setTimeout(() => noteRef.current(), 1600);
        return;
      }
    }
    // 순서가 바뀌었으면 고른 카드를 같은 자리로
    const a = anchor.current;
    const start =
      a && a.id === selectedEventId && selectedRow >= 0
        ? startOf(selectedRow)
        : undefined;
    if (
      a &&
      start !== undefined &&
      Math.abs(start - a.offset - box.scrollTop) > 1
    )
      box.scrollTop = start - a.offset;
    holdRef.current();
    // 순서(events)·고른 카드가 바뀔 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedRow, selectedEventId, half]);

  if (events.length === 0) {
    return (
      <p className="px-1 py-2 text-base text-muted">{messages.ui.noEvents}</p>
    );
  }

  return (
    <>
      <ol className="relative" style={{ height: list.getTotalSize() }}>
        {list.getVirtualItems().map((row) => {
          const slot = {
            "data-index": row.index,
            ref: list.measureElement,
            className: "absolute inset-x-0 top-0",
            style: { transform: `translateY(${row.start}px)` },
          };
          if (row.index === adAt)
            return (
              <li key={row.key} {...slot}>
                {ad}
              </li>
            );
          const e = eventAt(row.index);
          const region = REGION_BY_ID.get(e.region)!;
          const selected = e.id === selectedEventId;
          const summary = eventSummary(e, locale);
          const place = pick(e.place, locale);
          return (
            <li key={row.key} {...slot} id={`event-${e.id}`}>
              <article
                onClick={() => {
                  selectEvent(e.id);
                  focusOn(e.coords);
                }}
                className={clsx(
                  "cursor-pointer rounded-lg border bg-surface p-5 transition-colors",
                  selected
                    ? // 고른 카드: 안쪽에 또렷한 2px 한 줄(바깥 반투명 고리는 번져 보이고 목록 가장자리에서 잘렸다)
                      "border-accent shadow-[inset_0_0_0_1px_var(--accent)]"
                    : "border-line hover:border-muted/50",
                )}
              >
                {/* 사진이 있으면 제목 줄 왼쪽에 작은 정사각 사진 - 고른 카드도 같은 모양(카드 높이가 그대로라 절반 시트에 한 장이 다 보인다). 큰 사진은 상세 페이지 */}
                <div className="flex items-start gap-4">
                  {e.photo && (
                    <EventThumb event={e} alt={eventTitle(e, locale)} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-muted lg:text-base">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                        <span
                          aria-hidden
                          className="size-3 rounded-full"
                          style={{ backgroundColor: region.color }}
                        />
                        {messages.regions[e.region]}
                      </span>
                      <span>{formatWhen(e, locale)}</span>
                      {place && (
                        <span className="inline-flex items-center gap-0.5">
                          <PinIcon className="size-4 shrink-0" />
                          {place}
                        </span>
                      )}
                      {isOngoing(e, period) && (
                        <span className="rounded bg-accent/12 px-2 py-0.5 text-[13px] font-semibold text-accent">
                          {messages.ui.ongoing}
                        </span>
                      )}
                    </p>
                    <h3 className="mt-2 text-xl leading-snug font-bold lg:text-2xl xl:text-[26px]">
                      <button
                        type="button"
                        className="text-start"
                        aria-expanded={selected}
                      >
                        {eventTitle(e, locale)}
                      </button>
                    </h3>
                  </div>
                </div>
                {/* 위키백과 첫 문단을 4줄까지 보여 주고, "자세히"는 바로 사건 상세 페이지로(글 전체 + 본문 광고) */}
                <CardSummary
                  text={summary.text}
                  lang={summary.lang}
                  href={localeHref(locale, `event/${e.id}`)}
                  moreLabel={messages.ui.details}
                  source={
                    [
                      summary.page && `${messages.ui.wikipedia} · CC BY-SA 4.0`,
                      // 사진 출처(작가·라이선스)는 상세 페이지 큰 사진 아래
                      e.photo && messages.ui.photoInfo,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  className="mt-2 text-base text-muted lg:text-lg xl:text-[19px]"
                />
                {e.campaign && (
                  <a
                    href={localeHref(locale, `wars/${e.campaign}`)}
                    onClick={(ev) => ev.stopPropagation()}
                    className="mt-2 inline-flex h-10 items-center rounded-md bg-foreground px-3 text-sm font-semibold text-background lg:text-[15px]"
                  >
                    {messages.wars.openMap}
                  </a>
                )}
              </article>
            </li>
          );
        })}
      </ol>
      {/* 출처는 카드마다가 아니라 목록 끝에 한 번(문서별 원문 링크는 상세 페이지) */}
      <WikiCredit
        show={events.some((e) => eventSummary(e, locale).page)}
        from={messages.ui.creditFrom}
        wikipedia={messages.ui.wikipedia}
        wikipediaHome={`https://${locale}.wikipedia.org/`}
        note={messages.ui.creditNote}
      />
    </>
  );
}
