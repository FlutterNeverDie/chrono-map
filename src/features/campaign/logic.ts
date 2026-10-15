import type { Locale, WikiPage } from "@/lib/types";
import { formatYear } from "@/lib/year";
import type { Battle, Campaign, SideKey, Unit } from "./types";

export const yearOf = (t: number, unit: Unit) =>
  unit === "year" ? t : Math.floor(t / 12);

/** 그 시점에 그 나라의 진영. 기간이 맞는 마지막 규칙. 괄호 이름 "(X)"는 X 규칙도 본다 */
export function sideOf(c: Campaign, name: string, t: number): SideKey {
  const inner = name.match(/^\((.+)\)$/)?.[1];
  let side: SideKey = "n";
  for (const r of c.sideRules) {
    if (r.name !== name && r.name !== inner) continue;
    if ((r.from === null || t >= r.from) && (r.to === null || t <= r.to))
      side = r.side;
  }
  return side;
}

export const hasSides = (c: Campaign) => Boolean(c.sides.a);

/**
 * 그 시점의 전투, 중요한 순. 연 단위 전쟁은 전투가 드물어 앞뒤 1년까지 함께 보여준다.
 */
export function battlesAt(c: Campaign, t: number): Battle[] {
  const pad = c.unit === "year" ? 1 : 0;
  return c.battles
    .filter((b) => b.start - pad <= t && b.end + pad >= t)
    .sort((a, b) => b.links - a.links);
}

/** "1592년 4월" / "April 1592" (월 단위), "1592년" / "1592" (연 단위) */
export function formatTime(t: number, unit: Unit, locale: Locale): string {
  if (unit === "year") return formatYear(t, locale);
  const date = new Date(Date.UTC(Math.floor(t / 12), t % 12, 1));
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatRange(
  a: number,
  b: number,
  unit: Unit,
  locale: Locale,
): string {
  if (a === b) return formatTime(a, unit, locale);
  const range = `${formatTime(a, unit, locale)} – ${formatTime(b, unit, locale)}`;
  // 영어는 같은 기원을 한 번만: "AD 622 – AD 750" → "AD 622–750", "264 BC – 146 BC" → "264–146 BC"
  return locale === "en"
    ? range
        .replace(/^AD (\d+) – AD (\d+)$/, "AD $1–$2")
        .replace(/^(\d+) BC – (\d+) BC$/, "$1–$2 BC")
    : range;
}

/** 이름: 직접 쓴 이름(그 언어) → 그 언어 위키백과 → 직접 쓴 영어 → 영어 위키백과 → 직접 쓴 한국어 */
function ownOrWikiTitle(
  title: Partial<Record<Locale, string>> | undefined,
  wiki: Partial<Record<Locale, WikiPage>>,
  locale: Locale,
): string | undefined {
  return (
    title?.[locale] ??
    wiki[locale]?.title ??
    title?.en ??
    wiki.en?.title ??
    title?.ko
  );
}

/**
 * 설명: 그 언어 위키백과 → 직접 쓴 설명(그 언어) → 영어 위키백과 → 직접 쓴 영어 → 직접 쓴 한국어.
 * `page`가 있을 때만 위키백과 원문이므로 출처(문서 링크, CC BY-SA 4.0)를 붙인다.
 */
function ownOrWikiSummary(
  summary: Partial<Record<Locale, string>> | undefined,
  wiki: Partial<Record<Locale, WikiPage>>,
  locale: Locale,
): { text: string; page?: WikiPage; lang: Locale } {
  const own = wiki[locale];
  if (own) return { text: own.extract, page: own, lang: locale };
  if (summary?.[locale]) return { text: summary[locale]!, lang: locale };
  if (wiki.en) return { text: wiki.en.extract, page: wiki.en, lang: "en" };
  if (summary?.en) return { text: summary.en, lang: "en" };
  if (summary?.ko) return { text: summary.ko, lang: "ko" };
  return { text: "", lang: locale };
}

export function campaignTitle(c: Campaign, locale: Locale): string {
  return ownOrWikiTitle(c.title, c.wiki, locale) ?? c.wikipedia;
}

export const campaignSummary = (c: Campaign, locale: Locale) =>
  ownOrWikiSummary(c.summary, c.wiki, locale);

export function battleTitle(b: Battle, locale: Locale): string {
  return ownOrWikiTitle(b.title, b.wiki, locale) ?? b.wikipedia ?? b.id;
}

export const battleSummary = (b: Battle, locale: Locale) =>
  ownOrWikiSummary(b.summary, b.wiki, locale);

/** 슬라이더 눈금 연도: 기간에 맞춰 1·2·5·10·20·25·50·100년 간격 중 6~9개가 되는 것 */
export function tickYears(c: Campaign): number[] {
  const span = c.endYear - c.startYear;
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= 9) ?? 100;
  const first =
    Math.ceil((c.startYear + (c.unit === "month" ? 1 : 0)) / step) * step;
  const out: number[] = [];
  for (let y = first; y <= c.endYear; y += step) if (y !== 0) out.push(y);
  return out;
}
