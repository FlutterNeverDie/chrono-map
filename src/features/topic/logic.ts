import type { Locale } from "@/lib/types";
import { localizedSummary, localizedTitle, pick } from "@/lib/localize";
import { formatYear, formatYearRange } from "@/lib/year";
import type { Topic, TopicItem } from "./types";

export const MAX_POS = 1000;
const yearOf = (t: number) => Math.floor(t / 12);

/** 슬라이더 위치(0~1000) ↔ 월 번호. scale 연도들을 같은 간격으로 놓는 비선형 축 */
export function topicScale(topic: Topic) {
  const marks = topic.scale.map((y) => y * 12);
  const seg = MAX_POS / (marks.length - 1);
  return {
    first: marks[0],
    last: marks.at(-1)! + 11,
    toT(pos: number): number {
      const i = Math.min(marks.length - 2, Math.max(0, Math.floor(pos / seg)));
      const f = (pos - i * seg) / seg;
      return Math.round(marks[i] + (marks[i + 1] - marks[i]) * f);
    },
    toPos(t: number): number {
      if (t <= marks[0]) return 0;
      if (t >= marks.at(-1)!) return MAX_POS;
      const i = marks.findIndex((m, k) => t >= m && t < marks[k + 1]);
      return Math.round((i + (t - marks[i]) / (marks[i + 1] - marks[i])) * seg);
    },
    marks: topic.scale.map((y, i) => ({ year: y, pos: i * seg })),
  };
}

/** 이동·재생할 때 멈추는 시점: 항목 시작 + 확산 지점 */
export function keyframes(topic: Topic): number[] {
  const set = new Set<number>();
  for (const i of topic.items) {
    set.add(i.start);
    for (const s of i.spread) set.add(s.t);
  }
  return [...set].sort((a, b) => a - b);
}

/** 지금 지도에 보일 항목. span: 기간 안 / persist: 이미 생긴 것 전부 */
export function visibleItems(topic: Topic, t: number): TopicItem[] {
  return topic.mode === "span"
    ? topic.items.filter((i) => i.start <= t && t <= i.end)
    : topic.items.filter((i) => i.start <= t);
}

/** 오른쪽 "이 시기" 목록. span: 진행 중(중요한 순) / persist: 가장 최근에 생긴 8개 */
export function currentItems(topic: Topic, t: number): TopicItem[] {
  if (topic.mode === "span")
    return visibleItems(topic, t).sort(
      (a, b) => b.importance - a.importance || a.start - b.start,
    );
  return visibleItems(topic, t)
    .sort((a, b) => b.start - a.start)
    .slice(0, 8);
}

/** 연도 표시. 아주 오래전(1만 년 이상)은 "기원전 100만년"처럼 짧은 수로 */
export function formatYearShort(
  year: number,
  locale: Locale,
  approx = false,
): string {
  const text = formatYear(year, locale, approx);
  if (Math.abs(year) < 10_000) return text;
  const compact = new Intl.NumberFormat(locale, { notation: "compact" }).format(
    Math.abs(year),
  );
  return text.replace(String(Math.abs(year)), compact);
}

/** 슬라이더 표시: 월까지 보일지는 topic.showMonthFrom 이후인지로 정한다 */
export function formatT(t: number, topic: Topic, locale: Locale): string {
  const y = yearOf(t);
  if (topic.showMonthFrom === null || y < topic.showMonthFrom)
    return formatYearShort(y, locale);
  const date = new Date(Date.UTC(y, t % 12, 1));
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatItemWhen(
  i: TopicItem,
  topic: Topic,
  locale: Locale,
): string {
  const a = i.approx
    ? formatYearShort(yearOf(i.start), locale, true)
    : formatT(i.start, topic, locale);
  const sameYear =
    yearOf(i.start) === yearOf(i.end) && topic.showMonthFrom === null;
  if (topic.mode === "persist" || i.start === i.end || sameYear) return a;
  const [ya, yb] = [yearOf(i.start), yearOf(i.end)];
  const yearsOnly = (y: number) =>
    (topic.showMonthFrom === null || y < topic.showMonthFrom) &&
    Math.abs(y) < 10_000;
  // 연도로만 보이는 기간은 사건·전쟁과 같은 표기("AD 541~549")
  if (yearsOnly(ya) && yearsOnly(yb))
    return formatYearRange(ya, yb, locale, i.approx);
  return `${a} ~ ${formatT(i.end, topic, locale)}`;
}

export const topicTitle = (topic: Topic, locale: Locale) =>
  pick(topic.title, locale);
/** 항목 제목·설명: 사건·전쟁과 같은 대체 순서(lib/localize) */
export const itemTitle = (i: TopicItem, locale: Locale) =>
  localizedTitle(i.title, i.wiki, locale) ?? i.wikipedia;

export const itemSummary = (i: TopicItem, locale: Locale) =>
  localizedSummary(i.summary, i.wiki, locale);

/**
 * 슬라이더 위 항목 표식 자리. 위치는 슬라이더 위치값(0~MAX_POS).
 * span은 기간 막대를 겹치지 않게 여러 줄로 쌓고(최대 3줄), persist는 한 줄 눈금.
 */
export function itemMarks(topic: Topic) {
  const scale = topicScale(topic);
  const rows: number[] = [];
  return [...topic.items]
    .sort((a, b) => a.start - b.start)
    .map((i) => {
      const from = scale.toPos(i.start);
      const to =
        topic.mode === "span" ? Math.max(scale.toPos(i.end), from + 4) : from;
      let row = 0;
      if (topic.mode === "span") {
        row = rows.findIndex((end) => end + 3 < from);
        if (row === -1)
          row = rows.length < 3 ? rows.length : rows.indexOf(Math.min(...rows));
        rows[row] = Math.max(rows[row] ?? -Infinity, to);
      }
      return { item: i, from, to, row };
    });
}

/**
 * 항목별 색. 한 지도 안의 항목이 모두 같은 색이면 구분이 어려워 팔레트에서 돌려 쓴다.
 * 시작 순서대로 차례로 배정 → 시기가 가까운(같이 보이는) 항목끼리는 색이 다르다. 밝은·어두운 테마 모두 보이는 중간 밝기.
 */
const ITEM_PALETTE = [
  "#d62728",
  "#1f77b4",
  "#2ca02c",
  "#9467bd",
  "#ff7f0e",
  "#17becf",
  "#e377c2",
  "#8c564b",
  "#bcbd22",
];
const colorCache = new WeakMap<Topic, Map<string, string>>();
export function itemColor(topic: Topic, id: string): string {
  let m = colorCache.get(topic);
  if (!m) {
    m = new Map(
      [...topic.items]
        .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
        .map((it, i) => [it.id, ITEM_PALETTE[i % ITEM_PALETTE.length]]),
    );
    colorCache.set(topic, m);
  }
  return m.get(id) ?? topic.color;
}
