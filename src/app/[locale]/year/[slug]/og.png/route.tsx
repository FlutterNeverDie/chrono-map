import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { OG_PATH_LOCALES } from "@/components/og/card";
import { renderOg } from "@/components/og/render";
import { YEAR_PERIODS, periodSlug } from "@/features/pages";
import { yearCard } from "@/features/pages/og";

export const dynamic = "force-static";
export function generateStaticParams() {
  // 라우트 핸들러는 레이아웃의 언어 목록을 물려받지 않는다. 힌디어·아랍어는 영어 이미지를 쓴다 → 언어 × 기간
  return OG_PATH_LOCALES.flatMap((locale) =>
    YEAR_PERIODS.map((p) => ({ locale, slug: periodSlug(p) })),
  );
}
export const dynamicParams = false;

export async function GET(
  _: Request,
  { params }: RouteContext<"/[locale]/year/[slug]/og.png">,
) {
  const { locale, slug } = await params;
  const card = isLocale(locale) ? yearCard(locale, slug) : null;
  if (!card) notFound();
  return renderOg(card);
}
