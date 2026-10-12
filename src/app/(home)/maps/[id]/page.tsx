import { notFound } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { TOPICS, findTopic } from "@/features/topic/data";
import { topicMetadata } from "@/features/topic/meta";
import { TopicScreen } from "../../../TopicScreen";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ id: t.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/maps/[id]">) {
  const { id } = await params;
  return topicMetadata(DEFAULT_LOCALE, id);
}

export default async function Page({ params }: PageProps<"/maps/[id]">) {
  const { id } = await params;
  const topic = findTopic(id);
  if (!topic) notFound();
  return <TopicScreen locale={DEFAULT_LOCALE} topic={topic} />;
}
