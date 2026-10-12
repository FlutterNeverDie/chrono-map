// 전쟁 지도(content/campaigns/<id>/) 읽기 — 크로노맵 본 데이터와 따로 둔다
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { LOCALES } from "../../src/i18n/locales";
import type { Locale } from "../../src/lib/types";
import { root } from "../lib/content";

export const CAMPAIGNS_DIR = root("content/campaigns");
export const dirOf = (id: string) => `${CAMPAIGNS_DIR}/${id}`;

export type Unit = "month" | "year";
export type SideKey = "a" | "b" | "n";

export type Theme = {
  id: string;
  wikipedia: string;
  region: string;
  unit: Unit;
  /** 시작·끝 (unit이 month면 월 번호 = 연×12+월−1, year면 연도) */
  start: number;
  end: number;
  startYear: number;
  endYear: number;
  bordersStep: number;
  view: { lon: number; lat: number; zoom: number };
  search: { west: number; east: number; south: number; north: number };
  minLinks: number;
  sides: Partial<Record<"a" | "b", Partial<Record<Locale, string>>>>;
};

export const listCampaigns = () =>
  readdirSync(CAMPAIGNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${CAMPAIGNS_DIR}/${d.name}/theme.txt`))
    .map((d) => d.name)
    .sort();

/** "1592-04" | "1592" | "-264" → 시간값. 월 단위에서 연도만 쓰면 시작은 1월, 끝은 12월 */
export function toTime(value: string, unit: Unit, edge: "start" | "end" = "start"): number {
  const m = value.trim().match(/^(-?\d{1,4})(?:-(\d{2}))?$/);
  if (!m) throw new Error(`시간 형식이 아님("YYYY" 또는 "YYYY-MM"): ${value}`);
  const year = Number(m[1]);
  if (unit === "year") return year;
  const month = m[2] ? Number(m[2]) - 1 : edge === "end" ? 11 : 0;
  return year * 12 + month;
}
export const yearOfTime = (t: number, unit: Unit) => (unit === "year" ? t : Math.floor(t / 12));

function keyValues(file: string): [string, string][] {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes(":"))
    .map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]);
}

export function readTheme(id: string): Theme {
  const kv = new Map(keyValues(`${dirOf(id)}/theme.txt`));
  const need = (k: string) => {
    const v = kv.get(k);
    if (!v) throw new Error(`content/campaigns/${id}/theme.txt: ${k} 없음`);
    return v;
  };
  const unit = need("unit") as Unit;
  if (unit !== "month" && unit !== "year") throw new Error(`${id}: unit은 month | year`);
  const [a, b = a] = need("when").split("~").map((s) => s.trim());
  const nums = (k: string) => need(k).split(",").map((s) => Number(s.trim()));
  const [lon, lat, zoom] = nums("view");
  const [west, east, south, north] = nums("search");
  const sides: Theme["sides"] = {};
  for (const side of ["a", "b"] as const)
    for (const l of LOCALES) {
      const v = kv.get(`side.${side}.${l}`);
      if (v) (sides[side] ??= {})[l] = v;
    }
  const start = toTime(a, unit, "start");
  const end = toTime(b, unit, "end");
  return {
    id,
    wikipedia: need("wikipedia"),
    region: need("region"),
    unit,
    start,
    end,
    startYear: yearOfTime(start, unit),
    endYear: yearOfTime(end, unit),
    bordersStep: Number(kv.get("borders-step") ?? 1),
    view: { lon, lat, zoom },
    search: { west, east, south, north },
    minLinks: Number(kv.get("min-links") ?? 5),
    sides,
  };
}

export type BattleSource = {
  id: string;
  wikipedia: string;
  start: number;
  end: number;
  coords: [number, number];
  links: number;
};

/**
 * battles.txt(자동 생성) + extra-battles.txt(직접 추가, 자동 생성이 덮어쓰지 않음).
 * 같은 위키백과 문서가 두 파일에 있으면 extra 쪽을 쓴다.
 */
export function readBattles(id: string, unit: Unit): BattleSource[] {
  const extra = parseBattles(id, "extra-battles.txt", unit);
  const titles = new Set(extra.map((b) => b.wikipedia));
  return [...parseBattles(id, "battles.txt", unit).filter((b) => !titles.has(b.wikipedia)), ...extra].sort(
    (a, b) => a.start - b.start,
  );
}

function parseBattles(id: string, name: string, unit: Unit): BattleSource[] {
  const file = `${dirOf(id)}/${name}`;
  if (!existsSync(file)) return [];
  const out: BattleSource[] = [];
  for (const block of readFileSync(file, "utf8").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
    const head = lines.find((l) => l.startsWith("@"));
    if (!head) continue;
    const get = (k: string) => lines.find((l) => l.startsWith(`${k}:`))?.slice(k.length + 1).trim();
    const bid = head.slice(1).trim();
    const [a, b = a] = (get("when") ?? "").split("~").map((s) => s.trim());
    const [lon, lat] = (get("coords") ?? "").split(",").map(Number);
    if (!get("wikipedia") || !a || Number.isNaN(lon))
      throw new Error(`content/campaigns/${id}/${name} [${bid}] wikipedia·when·coords 필요`);
    const start = toTime(a, unit, "start");
    out.push({
      id: bid,
      wikipedia: get("wikipedia")!,
      start,
      end: Math.max(start, toTime(b, unit, "end")),
      coords: [lon, lat],
      links: Number(get("links") ?? 0),
    });
  }
  return out;
}

export type SideRule = { name: string; side: SideKey; from: number | null; to: number | null };

/** sides.txt: "원본 이름 = a | b | n [시작 ~ 끝]" */
export function readSides(id: string, unit: Unit): SideRule[] {
  const rules: SideRule[] = [];
  readFileSync(`${dirOf(id)}/sides.txt`, "utf8")
    .split("\n")
    .forEach((raw, i) => {
      const text = raw.replace(/#.*/, "").trim();
      if (!text) return;
      const m = text.match(/^(.+?) = (a|b|n)(?:\s+(-?[\d-]+)?\s*~\s*(-?[\d-]+)?)?$/);
      if (!m) throw new Error(`content/campaigns/${id}/sides.txt:${i + 1} 형식 오류: ${raw}`);
      rules.push({
        name: m[1].trim(),
        side: m[2] as SideKey,
        from: m[3] ? toTime(m[3], unit, "start") : null,
        to: m[4] ? toTime(m[4], unit, "end") : null,
      });
    });
  return rules;
}
