/**
 * OG 이미지용 부분 글꼴 받기: npm run og:fonts
 * 모든 OG 이미지(첫 화면·연도·사건 × 언어)에 쓰이는 글자만 모아 Google Fonts에서 받아
 * content/og-fonts/<묶음>-<굵기>-<번호>.ttf 로 저장한다(git에 올림, 빌드는 네트워크 없이 이 파일만 읽음).
 * 사건 제목·화면 문구가 바뀌면 다시 실행한다(빌드 때 빠진 글자가 있으면 경고가 나온다).
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES } from "../src/i18n/locales";
import { cardText } from "../src/components/og/card";
import {
  FONT_DIR,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  fontSets,
  type FontSet,
} from "../src/components/og/fonts";
import { allCards } from "../src/features/pages/og";

/** 한 번에 요청하는 글자 수. 너무 많으면 Google이 부분 글꼴 대신 전체 글꼴(10MB)을 준다 */
const CHUNK = 400;

async function download(family: string, weight: number, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`,
  ).then((r) => {
    if (!r.ok) throw new Error(`${family} ${weight}: ${r.status}`);
    return r.text();
  });
  // User-Agent 없이 요청하면 TrueType(satori가 읽는 형식) 주소를 준다
  const url = /src: url\((.+?)\) format\('truetype'\)/.exec(css)?.[1];
  if (!url) throw new Error(`${family} ${weight}: 글꼴 주소 없음`);
  return Buffer.from(new Uint8Array(await (await fetch(url)).arrayBuffer()));
}

async function main() {
  const chars: Record<FontSet, Set<string>> = {
    latin: new Set(),
    ko: new Set(),
    zh: new Set(),
  };
  // 라틴 글꼴은 모든 이미지의 대체 글꼴이라 기본 문자(ASCII)는 항상 넣는다
  for (let c = 0x20; c < 0x7f; c++) chars.latin.add(String.fromCharCode(c));
  // 긴 줄을 자를 때 붙는 말줄임표
  chars.latin.add("…");
  for (const card of allCards(LOCALES)) {
    const [main] = fontSets(card.locale);
    for (const ch of cardText(card)) {
      if (/\s/.test(ch)) continue;
      chars[main].add(ch);
      if (ch.codePointAt(0)! < 0x2e80) chars.latin.add(ch);
    }
  }

  mkdirSync(FONT_DIR, { recursive: true });
  for (const f of readdirSync(FONT_DIR))
    if (f.endsWith(".ttf")) rmSync(join(FONT_DIR, f));

  // 빌드 때 빠진 글자를 알리기 위한 목록(components/og/fonts.ts의 missingChars)
  writeFileSync(
    join(FONT_DIR, "chars.json"),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(chars).map(([k, v]) => [k, [...v].sort().join("")]),
      ),
    ),
  );
  for (const set of Object.keys(chars) as FontSet[]) {
    const all = [...chars[set]].sort();
    for (let part = 0; part * CHUNK < all.length; part++) {
      const text = all.slice(part * CHUNK, (part + 1) * CHUNK).join("");
      for (const weight of FONT_WEIGHTS) {
        const data = await download(FONT_FAMILIES[set], weight, text);
        if (data.length > 1024 * 1024)
          throw new Error(
            `${set} ${weight}: 부분 글꼴이 아닌 전체 글꼴을 받음 — CHUNK를 줄일 것`,
          );
        const file = `${set}-${weight}-${part}.ttf`;
        writeFileSync(join(FONT_DIR, file), data);
        console.log(`${file}  ${(data.length / 1024).toFixed(0)}KB`);
      }
    }
    console.log(`${set}: 글자 ${all.length}개`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
