import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads";
import { isLocale } from "@/i18n/locales";
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
}: PageProps<"/[locale]/maps/[id]/[item]">) {
  const { locale, id, item } = await params;
  return isLocale(locale) ? topicItemMetadata(locale, id, item) : {};
}

export default async function TopicItemPage({
  params,
}: PageProps<"/[locale]/maps/[id]/[item]">) {
  const { locale, id, item } = await params;
  if (!isLocale(locale) || !hasTopicItem(id, item)) notFound();
  return (
    <PageShell locale={locale}>
      <TopicItemDetail
        locale={locale}
        topicId={id}
        itemId={item}
        ad={<AdSlot name="article" className="mt-10" />}
      />
    </PageShell>
  );
}
