import { notFound } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { CAMPAIGNS, findCampaign } from "@/features/campaign/data";
import { campaignMetadata } from "@/features/campaign/meta";
import { CampaignScreen } from "../../../CampaignScreen";

export function generateStaticParams() {
  return CAMPAIGNS.map((c) => ({ id: c.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/wars/[id]">) {
  const { id } = await params;
  return campaignMetadata(DEFAULT_LOCALE, id);
}

export default async function Page({ params }: PageProps<"/wars/[id]">) {
  const { id } = await params;
  const campaign = findCampaign(id);
  if (!campaign) notFound();
  return <CampaignScreen locale={DEFAULT_LOCALE} campaign={campaign} />;
}
