import { notFound } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  PageShell,
  YEAR_PERIODS,
  YearDetail,
  periodSlug,
  yearMetadata,
  yearPage,
} from "@/features/pages";

export function generateStaticParams() {
  return YEAR_PERIODS.map((p) => ({ slug: periodSlug(p) }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/year/[slug]">) {
  const { slug } = await params;
  return yearMetadata(DEFAULT_LOCALE, slug);
}

export default async function YearPage({ params }: PageProps<"/year/[slug]">) {
  const { slug } = await params;
  if (!yearPage(slug)) notFound();
  return (
    <PageShell locale={DEFAULT_LOCALE}>
      <YearDetail locale={DEFAULT_LOCALE} slug={slug} />
    </PageShell>
  );
}
