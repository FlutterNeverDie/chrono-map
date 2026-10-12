import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { warsMetadata } from "@/features/campaign/meta";
import { TopicScreen } from "../../TopicScreen";
import { warsTopic } from "../../warsTopic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/wars">) {
  const { locale } = await params;
  return isLocale(locale) ? warsMetadata(locale) : {};
}

/** 전쟁 지도 첫 화면: 모든 전쟁을 지도 위에서 고른다 */
export default async function Page({ params }: PageProps<"/[locale]/wars">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TopicScreen locale={locale} topic={warsTopic()} section="wars" />;
}
