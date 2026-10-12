import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { TOPICS, findTopic } from "@/features/topic/data";
import { topicMetadata } from "@/features/topic/meta";
import { TopicScreen } from "../../../TopicScreen";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ id: t.id }));
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/maps/[id]">) {
  const { locale, id } = await params;
  return isLocale(locale) ? topicMetadata(locale, id) : {};
}

export default async function Page({
  params,
}: PageProps<"/[locale]/maps/[id]">) {
  const { locale, id } = await params;
  const topic = findTopic(id);
  if (!isLocale(locale) || !topic) notFound();
  return <TopicScreen locale={locale} topic={topic} />;
}
