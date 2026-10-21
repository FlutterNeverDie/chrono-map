import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { RootDocument } from "../RootDocument";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/i18n/locales";
import { SITE_URL, siteVerification } from "../site";
import { ogImage } from "@/components/og/card";

/** 한국어는 `/`(home)에서 처리하므로 나머지 언어만 정적 생성 */
export function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({
    locale,
  }));
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = getMessages(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: messages.metaTitle,
    description: messages.metaDescription,
    // 하위 페이지가 openGraph를 따로 정하지 않으면 이 첫 화면 이미지를 쓴다
    openGraph: {
      siteName: messages.siteName,
      images: ogImage(locale, "og.png"),
    },
    twitter: { card: "summary_large_image" },
    // 검색 사이트 소유 확인(구글·네이버·Bing) — 코드는 site.ts
    verification: siteVerification(),
    // 아이콘: app/icon.svg(자동) + iOS 홈 화면용 PNG
    // favicon.ico(app 루트)는 Next가 링크를 자동으로 넣는다
    icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
    // 아이폰 사파리가 연도·날짜·숫자를 날짜·전화번호로 알아보고 링크 속성을 붙이면 서버 HTML과 속성이 달라
    // 하이드레이션 경고가 났다("attributes of the server rendered HTML didn't match") - 자동 감지를 끈다
    formatDetection: {
      telephone: false,
      date: false,
      address: false,
      email: false,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === DEFAULT_LOCALE) notFound();
  return <RootDocument locale={locale}>{children}</RootDocument>;
}
