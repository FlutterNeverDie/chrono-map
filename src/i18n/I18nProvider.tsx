"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/types";
import type { Messages } from "./messages/ko";

type I18n = { locale: Locale; messages: Messages };

const I18nContext = createContext<I18n | null>(null);

/** 서버에서 고른 언어 하나의 사전만 클라이언트로 넘긴다 */
export function I18nProvider({
  locale,
  messages,
  children,
}: I18n & { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n은 I18nProvider 안에서만 쓸 수 있어요");
  return value;
}
