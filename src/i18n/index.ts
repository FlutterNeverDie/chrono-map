import type { Locale } from "@/lib/types";
import { ko, type Messages } from "./messages/ko";
import { en } from "./messages/en";
import { zh } from "./messages/zh";
import { es } from "./messages/es";
import { hi } from "./messages/hi";
import { ar } from "./messages/ar";
import { fr } from "./messages/fr";
import { pt } from "./messages/pt";

export type { Messages };

const MESSAGES: Record<Locale, Messages> = { ko, en, zh, es, hi, ar, fr, pt };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/** "{n}건" 같은 템플릿 채우기 */
export function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? `{${key}}`),
  );
}
