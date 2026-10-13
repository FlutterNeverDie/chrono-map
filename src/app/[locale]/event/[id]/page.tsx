import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads";
import { EVENTS } from "@/data/content";
import { isLocale } from "@/i18n/locales";
import {
  EventDetail,
  PageShell,
  eventMetadata,
  findEvent,
} from "@/features/pages";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ id: e.id }));
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/event/[id]">) {
  const { locale, id } = await params;
  return isLocale(locale) ? eventMetadata(locale, id) : {};
}

export default async function EventPage({
  params,
}: PageProps<"/[locale]/event/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !findEvent(id)) notFound();
  return (
    <PageShell locale={locale}>
      <EventDetail
        locale={locale}
        id={id}
        ad={<AdSlot name="article" className="mt-10" />}
      />
    </PageShell>
  );
}
