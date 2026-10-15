"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/types";
import { DEFAULT_LOCALE, LOCALE_INFO, isLocale } from "@/i18n/locales";
import type { Messages } from "@/i18n";

/**
 * 404 화면(global-not-found)에서 주소가 다른 언어(/en/…, /fr/…)로 시작하면 그 언어 문구로 바꾸고 첫 화면 링크를 그 언어로.
 * 하이드레이션이 끝난 뒤에 바꿔야 React가 되돌리지 않는다(그래서 head 스크립트가 아니라 useEffect).
 */
export function NotFoundLocale({
  texts,
}: {
  texts: Record<Locale, Messages["notFound"]>;
}) {
  useEffect(() => {
    const l = location.pathname.split("/")[1];
    if (!isLocale(l) || l === DEFAULT_LOCALE) return;
    document.documentElement.lang = l;
    document.documentElement.dir = LOCALE_INFO[l].dir;
    const t = texts[l];
    const set = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set("nf-title", t.title);
    set("nf-sub", t.body);
    set("nf-home", t.home);
    document.getElementById("nf-home")?.setAttribute("href", `/${l}`);
  }, [texts]);
  return null;
}
