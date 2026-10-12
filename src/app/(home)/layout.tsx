import type { Metadata, Viewport } from "next";
import { RootDocument } from "../RootDocument";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";

const messages = getMessages(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: messages.metaTitle,
  description: messages.metaDescription,
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
