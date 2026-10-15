import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { PageShell } from "@/features/pages";
import { findCampaign } from "@/features/campaign/data";
import { WarDetail, warDetailMetadata, warParams } from "../../../../details";

export const generateStaticParams = warParams;
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/wars/[id]/about">) {
  const { id } = await params;
  return warDetailMetadata(DEFAULT_LOCALE, id);
}

export default async function WarAboutPage({
  params,
}: PageProps<"/wars/[id]/about">) {
  const { id } = await params;
  if (!findCampaign(id)) notFound();
  return (
    <PageShell locale={DEFAULT_LOCALE}>
      <WarDetail
        locale={DEFAULT_LOCALE}
        id={id}
        ad={<AdSlot name="article" className="mt-10" />}
      />
    </PageShell>
  );
}
