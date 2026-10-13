import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { PageShell, YearIndex, yearIndexMetadata } from "@/features/pages";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/year">) {
  const { locale } = await params;
  return isLocale(locale) ? yearIndexMetadata(locale) : {};
}

export default async function YearIndexPage({
  params,
}: PageProps<"/[locale]/year">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <YearIndex locale={locale} />
    </PageShell>
  );
}
