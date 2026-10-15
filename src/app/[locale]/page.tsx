import { notFound } from "next/navigation";
import { HomeScreen } from "../HomeScreen";
import { isLocale } from "@/i18n/locales";
import { pageAlternates } from "@/i18n/alternates";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  return isLocale(locale) ? { alternates: pageAlternates(locale, "") } : {};
}

export default async function LocaleHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HomeScreen locale={locale} />;
}
