import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { isLocale } from "@/i18n/locales";
import { Ww2Screen } from "../../Ww2Screen";

export async function generateMetadata({ params }: PageProps<"/[locale]/ww2">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = getMessages(locale);
  return {
    title: `${m.ww2.title} — ${m.siteName}`,
    description: m.ww2.description,
  };
}

export default async function Page({ params }: PageProps<"/[locale]/ww2">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Ww2Screen locale={locale} />;
}
