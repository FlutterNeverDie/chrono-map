import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { WarList } from "./WarList";

/** 전쟁 지도 목록 페이지 (/wars) — 검색 노출용. 화면에서는 상단 바의 대화상자(WarsDialog)로 연다 */
export function WarsIndex({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">{m.wars.indexTitle}</h1>
      <p className="mt-3 text-lg text-muted">{m.wars.indexDescription}</p>
      <div className="mt-10">
        <WarList locale={locale} messages={m} />
      </div>
    </div>
  );
}

export function warsIndexMetadata(locale: Locale) {
  const m = getMessages(locale);
  return {
    title: `${m.wars.indexTitle} — ${m.siteName}`,
    description: m.wars.indexDescription,
  };
}
