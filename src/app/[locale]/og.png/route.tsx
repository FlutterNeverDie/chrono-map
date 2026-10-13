import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { OG_PATH_LOCALES } from "@/components/og/card";
import { renderOg } from "@/components/og/render";
import { homeCard } from "@/features/pages/og";

/** 공유 미리보기 이미지(빌드 때 /<언어>/og.png 파일로 만들어짐). */
export const dynamic = "force-static";
// 힌디어·아랍어는 영어 이미지를 쓴다
export function generateStaticParams() {
  return OG_PATH_LOCALES.map((locale) => ({ locale }));
}
export const dynamicParams = false;

export async function GET(
  _: Request,
  { params }: RouteContext<"/[locale]/og.png">,
) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return renderOg(homeCard(locale));
}
