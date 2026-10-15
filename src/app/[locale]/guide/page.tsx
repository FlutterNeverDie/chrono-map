import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { PageShell, TextPage, textPageMetadata } from "@/features/pages";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/guide">) {
  const { locale } = await params;
  return isLocale(locale) ? textPageMetadata(locale, "guide") : {};
}

export default async function Page({ params }: PageProps<"/[locale]/guide">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <TextPage locale={locale} kind="guide" />
    </PageShell>
  );
}
