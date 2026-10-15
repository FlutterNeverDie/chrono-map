import type { Metadata } from "next";
import { HomeScreen } from "../HomeScreen";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { pageAlternates } from "@/i18n/alternates";

export const metadata: Metadata = {
  alternates: pageAlternates(DEFAULT_LOCALE, ""),
};

export default function Home() {
  return <HomeScreen locale={DEFAULT_LOCALE} />;
}
