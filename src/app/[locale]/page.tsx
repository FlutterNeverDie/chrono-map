import { notFound } from "next/navigation";
import { HomeScreen } from "../HomeScreen";
import { isLocale } from "@/i18n/locales";

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HomeScreen locale={locale} />;
}
