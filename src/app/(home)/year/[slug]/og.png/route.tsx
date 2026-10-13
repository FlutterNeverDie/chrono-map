import { notFound } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { renderOg } from "@/components/og/render";
import { YEAR_PERIODS, periodSlug } from "@/features/pages";
import { yearCard } from "@/features/pages/og";

export const dynamic = "force-static";
export function generateStaticParams() {
  return YEAR_PERIODS.map((p) => ({ slug: periodSlug(p) }));
}
export const dynamicParams = false;

export async function GET(
  _: Request,
  { params }: RouteContext<"/year/[slug]/og.png">,
) {
  const { slug } = await params;
  const card = yearCard(DEFAULT_LOCALE, slug);
  if (!card) notFound();
  return renderOg(card);
}
