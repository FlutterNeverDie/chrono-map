import { DEFAULT_LOCALE } from "@/i18n/locales";
import { PageShell, YearIndex, yearIndexMetadata } from "@/features/pages";

export const metadata = yearIndexMetadata(DEFAULT_LOCALE);

export default function YearIndexPage() {
  return (
    <PageShell locale={DEFAULT_LOCALE}>
      <YearIndex locale={DEFAULT_LOCALE} />
    </PageShell>
  );
}
