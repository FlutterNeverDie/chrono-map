import { notFound } from "next/navigation";
import { AdSlot } from "@/features/ads";
import { EVENTS } from "@/data/content";
import { DEFAULT_LOCALE } from "@/i18n/locales";
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

export async function generateMetadata({ params }: PageProps<"/event/[id]">) {
  const { id } = await params;
  return eventMetadata(DEFAULT_LOCALE, id);
}

export default async function EventPage({ params }: PageProps<"/event/[id]">) {
  const { id } = await params;
  if (!findEvent(id)) notFound();
  return (
    <PageShell locale={DEFAULT_LOCALE}>
      <EventDetail
        locale={DEFAULT_LOCALE}
        id={id}
        ad={<AdSlot name="article" className="mt-10" />}
      />
    </PageShell>
  );
}
