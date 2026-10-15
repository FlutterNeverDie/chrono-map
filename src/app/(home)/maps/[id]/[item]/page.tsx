import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { PageShell } from "@/features/pages";
import {
  TopicItemDetail,
  hasTopicItem,
  topicItemMetadata,
  topicItemParams,
} from "../../../../details";

export const generateStaticParams = topicItemParams;
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/maps/[id]/[item]">) {
  const { id, item } = await params;
  return topicItemMetadata(DEFAULT_LOCALE, id, item);
}

export default async function TopicItemPage({
  params,
}: PageProps<"/maps/[id]/[item]">) {
  const { id, item } = await params;
  if (!hasTopicItem(id, item)) notFound();
  return (
    <PageShell locale={DEFAULT_LOCALE}>
      <TopicItemDetail
        locale={DEFAULT_LOCALE}
        topicId={id}
        itemId={item}
        ad={<AdSlot name="article" className="mt-10" />}
      />
    </PageShell>
  );
}
