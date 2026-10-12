import type { Metadata } from "next";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { Ww2Screen } from "../../Ww2Screen";

const m = getMessages(DEFAULT_LOCALE);
export const metadata: Metadata = {
  title: `${m.ww2.title} — ${m.siteName}`,
  description: m.ww2.description,
};

export default function Page() {
  return <Ww2Screen locale={DEFAULT_LOCALE} />;
}
