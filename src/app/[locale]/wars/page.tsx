import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { PageShell } from "@/features/pages";
import { WarsIndex, warsIndexMetadata } from "@/features/campaign/WarsIndex";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/wars">) {
  const { locale } = await params;
  return isLocale(locale) ? warsIndexMetadata(locale) : {};
}

export default async function Page({ params }: PageProps<"/[locale]/wars">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <WarsIndex locale={locale} />
    </PageShell>
  );
}
