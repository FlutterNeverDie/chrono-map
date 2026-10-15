"use client";

import { useEffect } from "react";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";

/**
 * 404 화면(global-not-found)에서 주소가 다른 언어(/en/…)로 시작하면 영어로 바꾸고 첫 화면 링크를 그 언어로.
 * 하이드레이션이 끝난 뒤에 바꿔야 React가 되돌리지 않는다(그래서 head 스크립트가 아니라 useEffect).
 */
export function NotFoundLocale() {
  useEffect(() => {
    const l = location.pathname.split("/")[1];
    if (l === DEFAULT_LOCALE || !(LOCALES as string[]).includes(l)) return;
    document.documentElement.lang = "en";
    const set = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set("nf-title", "Page not found");
    set("nf-sub", "The page you are looking for does not exist.");
    set("nf-home", "Home");
    document.getElementById("nf-home")?.setAttribute("href", `/${l}`);
  }, []);
  return null;
}
