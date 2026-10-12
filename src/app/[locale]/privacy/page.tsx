import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { PageShell, TextPage, textPageMetadata } from "@/features/pages";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  return isLocale(locale) ? textPageMetadata(locale, "privacy") : {};
}

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <TextPage locale={locale} kind="privacy" />
    </PageShell>
  );
}
