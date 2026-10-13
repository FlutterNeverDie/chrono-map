import { notFound } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { EVENTS } from "@/data/content";
import { renderOg } from "@/components/og/render";
import { eventCard } from "@/features/pages/og";

export const dynamic = "force-static";
export function generateStaticParams() {
  return EVENTS.map((e) => ({ id: e.id }));
}
export const dynamicParams = false;

export async function GET(
  _: Request,
  { params }: RouteContext<"/event/[id]/og.png">,
) {
  const { id } = await params;
  const card = eventCard(DEFAULT_LOCALE, id);
  if (!card) notFound();
  return renderOg(card);
}
