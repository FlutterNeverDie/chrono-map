import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { OG_PATH_LOCALES } from "@/components/og/card";
import { EVENTS } from "@/data/content";
import { renderOg } from "@/components/og/render";
import { eventCard } from "@/features/pages/og";

export const dynamic = "force-static";
export function generateStaticParams() {
  // 라우트 핸들러는 레이아웃의 언어 목록을 물려받지 않는다. 힌디어·아랍어는 영어 이미지를 쓴다 → 언어 × 사건
  return OG_PATH_LOCALES.flatMap((locale) =>
    EVENTS.map((e) => ({ locale, id: e.id })),
  );
}
export const dynamicParams = false;

export async function GET(
  _: Request,
  { params }: RouteContext<"/[locale]/event/[id]/og.png">,
) {
  const { locale, id } = await params;
  const card = isLocale(locale) ? eventCard(locale, id) : null;
  if (!card) notFound();
  return renderOg(card);
}
