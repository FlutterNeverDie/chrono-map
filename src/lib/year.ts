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

/** 사건의 때: 한 해면 "1492년", 기간이면 "1592년 – 1598년"(영어 "1592–1598"), 부정확하면 "약 …" */
export function formatWhen(
  e: Pick<HistoryEvent, "start" | "end" | "precision">,
  locale: Locale,
): string {
  const approx = e.precision !== "year";
  if (e.start === e.end) return formatYear(e.start, locale, approx);
  if (locale === "en" && (e.start > 0 || e.end < 0)) {
    // 영어는 같은 기원 안의 기간을 한 번만 붙여 "1592–1598", "AD 66–74", "300–201 BC"
    const [a, b] = [Math.abs(e.start), Math.abs(e.end)];
    const text =
      e.end < 0 ? `${a}–${b} BC` : e.start < 1000 ? `AD ${a}–${b}` : `${a}–${b}`;
    return approx ? FORMATS.en.approx.replace("{s}", text) : text;
  }
  return `${formatYear(e.start, locale, approx)} – ${formatYear(e.end, locale)}`;
}
