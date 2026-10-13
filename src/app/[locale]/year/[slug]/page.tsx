import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads";
import { isLocale } from "@/i18n/locales";
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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/year/[slug]">) {
  const { locale, slug } = await params;
  return isLocale(locale) ? yearMetadata(locale, slug) : {};
}

export default async function YearPage({
  params,
}: PageProps<"/[locale]/year/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !yearPage(slug)) notFound();
  return (
    <PageShell locale={locale}>
      <YearDetail
        locale={locale}
        slug={slug}
        ad={<AdSlot name="article" className="mt-10" />}
      />
    </PageShell>
  );
}
