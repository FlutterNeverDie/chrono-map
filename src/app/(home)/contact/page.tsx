import { DEFAULT_LOCALE } from "@/i18n/locales";
import { PageShell, TextPage, textPageMetadata } from "@/features/pages";

export const metadata = textPageMetadata(DEFAULT_LOCALE, "contact");

export default function Page() {
  return (
    <PageShell locale={DEFAULT_LOCALE}>
      <TextPage locale={DEFAULT_LOCALE} kind="contact" />
    </PageShell>
  );
}
