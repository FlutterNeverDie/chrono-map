import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { CAMPAIGNS, findCampaign } from "@/features/campaign/data";
import { campaignMetadata } from "@/features/campaign/meta";
import { CampaignScreen } from "../../../CampaignScreen";

export function generateStaticParams() {
  return CAMPAIGNS.map((c) => ({ id: c.id }));
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/wars/[id]">) {
  const { locale, id } = await params;
  return isLocale(locale) ? campaignMetadata(locale, id) : {};
}

export default async function Page({
  params,
}: PageProps<"/[locale]/wars/[id]">) {
  const { locale, id } = await params;
  const campaign = findCampaign(id);
  if (!isLocale(locale) || !campaign) notFound();
  return <CampaignScreen locale={locale} campaign={campaign} />;
}
