import type { HistoryEvent, Locale } from "./types";

const FORMATS: Record<Locale, { bc: string; ad: string; approx: string }> = {
  ko: { bc: "기원전 {n}년", ad: "{n}년", approx: "약 {s}" },
  en: { bc: "{n} BC", ad: "{n}", approx: "c. {s}" },
  zh: { bc: "公元前{n}年", ad: "{n}年", approx: "约{s}" },
  es: { bc: "{n} a. C.", ad: "{n}", approx: "c. {s}" },
  hi: { bc: "{n} ई.पू.", ad: "{n}", approx: "लगभग {s}" },
  ar: { bc: "{n} ق.م", ad: "{n}", approx: "حوالي {s}" },
  fr: { bc: "{n} av. J.-C.", ad: "{n}", approx: "vers {s}" },
  pt: { bc: "{n} a.C.", ad: "{n}", approx: "c. {s}" },
};

/** 연도 표시. 기원전은 음수로 저장한다. */
export function formatYear(
  year: number,
  locale: Locale,
  approximate = false,
): string {
  const f = FORMATS[locale];
  // 영어: 서기 1000년 전은 "9"만 쓰면 숫자로 읽히므로 "AD 9"
  const ad = locale === "en" && year < 1000 ? "AD {n}" : f.ad;
  const text = (year < 0 ? f.bc : ad).replace("{n}", String(Math.abs(year)));
  return approximate ? f.approx.replace("{s}", text) : text;
}

/** 사건의 때: 한 해면 "1492년", 기간이면 "1592년 ~ 1598년"(영어 "1592~1598"), 부정확하면 "약 …" */
export function formatWhen(
  e: Pick<HistoryEvent, "start" | "end" | "precision">,
  locale: Locale,
): string {
  const approx = e.precision !== "year";
  return formatYearRange(e.start, e.end, locale, approx);
}

/**
 * 연도 기간(사건·전쟁·주제 지도 공통): "1592년 ~ 1598년", 영어는 같은 기원을 한 번만 붙여 "1592~1598", "AD 66~74", "300~201 BC".
 * 시작과 끝이 같으면 한 해만.
 */
export function formatYearRange(
  start: number,
  end: number,
  locale: Locale,
  approx = false,
): string {
  if (start === end) return formatYear(start, locale, approx);
  if (locale === "en" && (start > 0 || end < 0)) {
    const [a, b] = [Math.abs(start), Math.abs(end)];
    const text =
      end < 0 ? `${a}~${b} BC` : start < 1000 ? `AD ${a}~${b}` : `${a}~${b}`;
    return approx ? FORMATS.en.approx.replace("{s}", text) : text;
  }
  return `${formatYear(start, locale, approx)} ~ ${formatYear(end, locale)}`;
}

/**
 * 일 단위 날짜(서기 "YYYY-MM-DD") 표기 - 하루면 "1914년 8월 17일", 기간이면 Intl formatRange가 같은 해·달을 줄여 적는다
 * ("1916년 7월 1일~11월 18일", "July 1 – November 18, 1916")
 */
export function formatDayRange(a: string, b: string, locale: Locale): string {
  const date = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const t = new Date(Date.UTC(2000, m - 1, d));
    t.setUTCFullYear(y);
    return t;
  };
  const f = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  if (a === b) return f.format(date(a));
  // 중국어는 Intl formatRange가 "1861/4/12 – 1861/4/14"처럼 숫자로만 적어(Node) 관례대로 직접: 1861年4月12日至14日
  if (locale === "zh") {
    const [y1, m1, d1] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    const end =
      y1 !== y2
        ? `${y2}年${m2}月${d2}日`
        : m1 !== m2
          ? `${m2}月${d2}日`
          : `${d2}日`;
    return `${y1}年${m1}月${d1}日至${end}`;
  }
  return f.formatRange(date(a), date(b));
}
