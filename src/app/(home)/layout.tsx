import type { Metadata, Viewport } from "next";
import { RootDocument } from "../RootDocument";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** `/`는 한국어. 전에 다른 언어를 골랐다면 그 언어 페이지로 보낸다 */
const redirectScript = `(function(){try{var l=localStorage.getItem("locale");if(l&&l!=="${DEFAULT_LOCALE}"&&${JSON.stringify(LOCALES)}.indexOf(l)>-1)location.replace("/"+l)}catch(e){}})()`;

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootDocument locale={DEFAULT_LOCALE} headScript={redirectScript}>
      {children}
    </RootDocument>
  );
}
