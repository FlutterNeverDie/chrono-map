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

/**
 * 처음 시점(주소에 ?item이 없을 때): 첫 항목(왼쪽 끝)이면 점 하나만 보여서, 지도에 가장 많이 보이는 때로.
 * span: 항목이 가장 많이 겹치는 때(같으면 중요도 합, 그다음 이른 때) / persist: 마지막 키프레임(전부 보임)
 */
export function startT(topic: Topic): number {
  if (topic.start !== undefined) return topic.start;
  const times = keyframes(topic);
  if (!times.length) return topic.scale[0] * 12;
  if (topic.mode === "persist") return times[times.length - 1];
  let best = times[0];
  let most = [-1, -1];
  for (const t of topic.items.map((i) => i.start).sort((a, b) => a - b)) {
    const shown = visibleItems(topic, t);
    const score = [shown.length, shown.reduce((s, i) => s + i.importance, 0)];
    if (score[0] > most[0] || (score[0] === most[0] && score[1] > most[1])) {
      most = score;
      best = t;
    }
  }
  return best;
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

/** 항목 이름표 자리: 점 기준 오프셋(핀 그림 단위 - 화면 크기 = 값 × 1.2/배율 지도 단위), 글자 정렬 */
export type LabelSpot = {
  dx: number;
  dy: number;
  anchor: "middle" | "start" | "end";
};
/**
 * 강조 항목 이름표 자리(svg·WebGL 지도 공통): 고른 항목 → 중요한 순으로 위·아래·오른쪽·왼쪽을 차례로 시도하고,
 * 다른 이름표나 **점**과 겹치면 다음 자리, 다 막히면 이름을 뺀다(고른 항목은 위에 무조건).
 * project: 좌표 → 지도 좌표, zoom: 배율, title: 항목 이름
 */
export function itemLabelSpots(
  items: TopicItem[],
  isStrong: (id: string) => boolean,
  selected: string | null,
  project: (c: [number, number]) => readonly [number, number] | null,
  zoom: number,
  title: (it: TopicItem) => string,
): Map<string, LabelSpot> {
  const s = (1 / zoom) * 1.2;
  const out = new Map<string, LabelSpot>();
  type Box = [number, number, number, number];
  const overlaps = (a: Box, b: Box) =>
    a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  // 모든 점을 장애물로
  const boxes: Box[] = [];
  for (const it of items) {
    const at = project(it.coords);
    if (!at) continue;
    const rr = ((isStrong(it.id) ? 8 : 4.5) + 2.5) * s;
    boxes.push([at[0] - rr, at[1] - rr, at[0] + rr, at[1] + rr]);
  }
  const strong = items
    .filter((it) => isStrong(it.id))
    .sort(
      (a, b) =>
        Number(b.id === selected) - Number(a.id === selected) ||
        b.importance - a.importance,
    );
  for (const it of strong) {
    const at = project(it.coords);
    if (!at) continue;
    const r = 8;
    const w = [...title(it)].reduce(
      (sum, ch) => sum + (ch.codePointAt(0)! >= 0x2e80 ? 12 : 7),
      0,
    );
    const spots: LabelSpot[] = [
      { dx: 0, dy: -r - 7, anchor: "middle" },
      { dx: 0, dy: r + 17, anchor: "middle" },
      { dx: r + 5, dy: 4, anchor: "start" },
      { dx: -r - 5, dy: 4, anchor: "end" },
    ];
    for (const spot of spots) {
      const left =
        spot.anchor === "middle"
          ? spot.dx - w / 2
          : spot.anchor === "start"
            ? spot.dx
            : spot.dx - w;
      const box: Box = [
        at[0] + left * s,
        at[1] + (spot.dy - 11) * s,
        at[0] + (left + w) * s,
        at[1] + (spot.dy + 3) * s,
      ];
      if (it.id !== selected && boxes.some((b) => overlaps(box, b))) continue;
      boxes.push(box);
      out.set(it.id, spot);
      break;
    }
  }
  return out;
}
