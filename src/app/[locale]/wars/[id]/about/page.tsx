import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads";
import { isLocale } from "@/i18n/locales";
import { PageShell } from "@/features/pages";
import { findCampaign } from "@/features/campaign/data";
import { WarDetail, warDetailMetadata, warParams } from "../../../../details";

export const generateStaticParams = warParams;
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/wars/[id]/about">) {
  const { locale, id } = await params;
  return isLocale(locale) ? warDetailMetadata(locale, id) : {};
}

export default async function WarAboutPage({
  params,
}: PageProps<"/[locale]/wars/[id]/about">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !findCampaign(id)) notFound();
  return (
    <PageShell locale={locale}>
      <WarDetail
        locale={locale}
        id={id}
        ad={<AdSlot name="article" className="mt-10" />}
      />
    </PageShell>
  );
}
