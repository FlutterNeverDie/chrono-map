import type { Metadata, Viewport } from "next";
import { RootDocument } from "../RootDocument";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { localeRedirectScript } from "@/i18n/localeRedirect";
import { SITE_URL } from "../site";
import { ogImage } from "@/components/og/card";

const messages = getMessages(DEFAULT_LOCALE);

export const metadata: Metadata = {
  // canonical·hreflang·OG 이미지 같은 상대 주소를 절대 주소로 바꾸는 기준
  metadataBase: new URL(SITE_URL),
  title: messages.metaTitle,
  description: messages.metaDescription,
  // 하위 페이지가 openGraph를 따로 정하지 않으면 이 첫 화면 이미지를 쓴다
  openGraph: {
    siteName: messages.siteName,
    images: ogImage(DEFAULT_LOCALE, "og.png"),
  },
  twitter: { card: "summary_large_image" },
  // Google Search Console 소유 확인(배포 때 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION)
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  // 아이콘: app/icon.svg(자동) + iOS 홈 화면용 PNG
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootDocument locale={DEFAULT_LOCALE} headScript={localeRedirectScript}>
      {children}
    </RootDocument>
  );
}
