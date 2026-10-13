import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/lib/types";

/**
 * OG 이미지용 부분 글꼴. `npm run og:fonts`가 이미지에 실제로 쓰이는 글자만 담아
 * content/og-fonts/<묶음>-<굵기>-<번호>.ttf 로 받아 둔다(빌드는 네트워크 없이 이 파일만 읽는다).
 * 글자가 많으면 한 묶음이 여러 파일(번호)로 나뉜다.
 */
export const FONT_DIR = join(process.cwd(), "content/og-fonts");

export type FontSet = "latin" | "ko" | "zh";
/** 묶음별 Google Fonts 글꼴 이름 */
export const FONT_FAMILIES: Record<FontSet, string> = {
  latin: "Noto Sans",
  ko: "Noto Sans KR",
  zh: "Noto Sans SC",
};
export const FONT_WEIGHTS = [500, 700] as const;

/** 그 언어 이미지에 쓰는 묶음 (그 언어 글꼴 → 라틴 순) */
export function fontSets(locale: Locale): FontSet[] {
  if (locale === "ko") return ["ko", "latin"];
  if (locale === "zh") return ["zh", "latin"];
  return ["latin"];
}

type LoadedFont = {
  /** "ko-0" 처럼 묶음-번호. 굵기 두 개가 같은 이름을 쓴다 */
  name: string;
  data: Buffer;
  weight: (typeof FONT_WEIGHTS)[number];
  style: "normal";
};

let cache: LoadedFont[] | null = null;
function allFonts(): LoadedFont[] {
  cache ??= readdirSync(FONT_DIR)
    .filter((f) => f.endsWith(".ttf"))
    .sort()
    .map((file) => {
      const [set, weight, part] = file.replace(".ttf", "").split("-");
      return {
        name: `${set}-${part}`,
        data: readFileSync(join(FONT_DIR, file)),
        weight: Number(weight) as LoadedFont["weight"],
        style: "normal" as const,
      };
    });
  return cache;
}

/** 그 언어 이미지에 넣을 글꼴과 font-family 목록(앞의 글꼴에 없는 글자는 뒤에서 찾는다) */
export function fontsFor(locale: Locale): {
  fonts: LoadedFont[];
  family: string;
} {
  const sets = fontSets(locale);
  const fonts = allFonts().filter((f) =>
    sets.includes(f.name.split("-")[0] as FontSet),
  );
  const names = sets.flatMap((s) =>
    [...new Set(fonts.map((f) => f.name))].filter((n) => n.startsWith(`${s}-`)),
  );
  return { fonts, family: names.join(", ") };
}

let covered: Record<FontSet, string> | null = null;
/** 글꼴에 없는 글자(og:fonts 이후 사건 제목·문구가 바뀐 경우). 있으면 `npm run og:fonts`를 다시 실행 */
export function missingChars(locale: Locale, text: string): string[] {
  covered ??= JSON.parse(readFileSync(join(FONT_DIR, "chars.json"), "utf8"));
  const have = fontSets(locale)
    .map((s) => covered![s])
    .join("");
  return [...new Set(text)].filter(
    (ch) => !/\s/.test(ch) && !have.includes(ch),
  );
}
