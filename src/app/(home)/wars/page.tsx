import { DEFAULT_LOCALE } from "@/i18n/locales";
import { PageShell } from "@/features/pages";
import { WarsIndex, warsIndexMetadata } from "@/features/campaign/WarsIndex";

export const metadata = warsIndexMetadata(DEFAULT_LOCALE);

export default function Page() {
  return (
    <PageShell locale={DEFAULT_LOCALE}>
      <WarsIndex locale={DEFAULT_LOCALE} />
    </PageShell>
  );
}
