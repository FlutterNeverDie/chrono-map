// 2차대전 지도 데이터(content/ww2) 읽기 — 크로노맵 본 데이터와 따로 둔다
import { existsSync, readFileSync } from "node:fs";
import { root } from "../lib/content";

export const WW2_DIR = root("content/ww2");
export const BATTLES_FILE = `${WW2_DIR}/battles.txt`;
export const SIDES_FILE = `${WW2_DIR}/sides.txt`;
export const WIKI_FILE = `${WW2_DIR}/wikipedia.json`;

export type Side = "axis" | "allies" | "neutral";

/** "1942-08" → 월 번호(연*12 + 월-1) */
export function monthIndex(value: string): number {
  const m = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`"YYYY-MM" 형식이 아님: ${value}`);
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}

export type BattleSource = {
  id: string;
  wikipedia: string;
  start: number;
  end: number;
  coords: [number, number];
  links: number;
};

export function readBattles(): BattleSource[] {
  if (!existsSync(BATTLES_FILE)) return [];
  const out: BattleSource[] = [];
  for (const block of readFileSync(BATTLES_FILE, "utf8").split(/\n\s*\n/)) {
    const lines = block
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#"));
    const head = lines.find((l) => l.startsWith("@"));
    if (!head) continue;
    const get = (k: string) =>
      lines
        .find((l) => l.startsWith(`${k}:`))
        ?.slice(k.length + 1)
        .trim();
    const id = head.slice(1).trim();
    const [a, b = a] = (get("when") ?? "").split("~").map((s) => s.trim());
    const [lon, lat] = (get("coords") ?? "").split(",").map(Number);
    if (!get("wikipedia") || !a || Number.isNaN(lon))
      throw new Error(`battles.txt [${id}] wikipedia·when·coords 필요`);
    out.push({
      id,
      wikipedia: get("wikipedia")!,
      start: monthIndex(a),
      end: Math.max(monthIndex(a), monthIndex(b)),
      coords: [lon, lat],
      links: Number(get("links") ?? 0),
    });
  }
  return out;
}

export type SideRule = {
  name: string;
  side: Side;
  from: number | null;
  to: number | null;
};

/** sides.txt: "원본 이름 = 진영 [YYYY-MM ~ YYYY-MM]" */
export function readSides(): SideRule[] {
  const rules: SideRule[] = [];
  readFileSync(SIDES_FILE, "utf8")
    .split("\n")
    .forEach((raw, i) => {
      const text = raw.replace(/#.*/, "").trim();
      if (!text) return;
      const m = text.match(
        /^(.+?) = (axis|allies|neutral)(?:\s+(\d{4}-\d{2})?\s*~\s*(\d{4}-\d{2})?)?$/,
      );
      if (!m)
        throw new Error(`content/ww2/sides.txt:${i + 1} 형식 오류: ${raw}`);
      rules.push({
        name: m[1].trim(),
        side: m[2] as Side,
        from: m[3] ? monthIndex(m[3]) : null,
        to: m[4] ? monthIndex(m[4]) : null,
      });
    });
  return rules;
}
