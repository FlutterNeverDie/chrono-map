// 주제 지도(content/topics/<id>/) 읽기 — 크로노맵 본 데이터·전쟁 지도와 따로 둔다
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { LOCALES } from "../../src/i18n/locales";
import type { Locale } from "../../src/lib/types";
import { root } from "../lib/content";

export const TOPICS_DIR = root("content/topics");
export const topicDir = (id: string) => `${TOPICS_DIR}/${id}`;

export const listTopics = () =>
  readdirSync(TOPICS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${TOPICS_DIR}/${d.name}/topic.txt`))
    .map((d) => d.name)
    .sort();

/** 시간값 = 월 번호(연×12 + 월−1). "1348" | "1348-06" | "-430". 연도만 쓰면 시작은 1월, 끝은 12월 */
export function toMonth(value: string, edge: "start" | "end" = "start"): number {
  const m = value.trim().match(/^(-?\d+)(?:-(\d{2}))?$/);
  if (!m) throw new Error(`시간 형식이 아님("YYYY" 또는 "YYYY-MM"): ${value}`);
  return Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : edge === "end" ? 11 : 0);
}

const lines = (file: string) =>
  readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

export type Topic = {
  id: string;
  order: number;
  /** span: 기간 동안만 보임(전염병) · persist: 생긴 뒤 계속 남음(발명) */
  mode: "span" | "persist";
  /** 슬라이더 눈금 연도(같은 간격으로 배치되는 비선형 축) */
  scale: number[];
  /** 이 연도부터는 슬라이더에 월까지 표시 (없으면 연도만) */
  showMonthFrom: number | null;
  view: { lon: number; lat: number; zoom: number };
  color: string;
  /** 하단 바 지도 아이콘 이름(virus · bulb · map) */
  icon: string;
  title: Partial<Record<Locale, string>>;
  description: Partial<Record<Locale, string>>;
};

export function readTopic(id: string): Topic {
  const kv = new Map(
    lines(`${topicDir(id)}/topic.txt`).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]),
  );
  const need = (k: string) => {
    const v = kv.get(k);
    if (!v) throw new Error(`content/topics/${id}/topic.txt: ${k} 없음`);
    return v;
  };
  const nums = (k: string) => need(k).split(",").map((s) => Number(s.trim()));
  const mode = need("mode");
  if (mode !== "span" && mode !== "persist") throw new Error(`${id}: mode는 span | persist`);
  const [lon, lat, zoom] = nums("view");
  const localized = (prefix: string) =>
    Object.fromEntries(LOCALES.filter((l) => kv.get(`${prefix}.${l}`)).map((l) => [l, kv.get(`${prefix}.${l}`)!]));
  const title = localized("title");
  if (!title.ko) throw new Error(`${id}: title.ko 필요`);
  return {
    id,
    order: Number(kv.get("order") ?? 99),
    mode,
    scale: nums("scale"),
    showMonthFrom: kv.has("show-month-from") ? Number(kv.get("show-month-from")) : null,
    view: { lon, lat, zoom },
    color: kv.get("color") ?? "#b4232a",
    icon: kv.get("icon") ?? "map",
    title,
    description: localized("description"),
  };
}

export type SpreadPoint = { t: number; coords: [number, number] };
export type ItemSource = {
  id: string;
  wikipedia: string;
  start: number;
  end: number;
  approx: boolean;
  coords: [number, number];
  spread: SpreadPoint[];
  importance: number;
  /** 직접 쓴 제목·설명 — 그 언어 위키백과 문서가 없을 때 쓴다 */
  title: Partial<Record<Locale, string>>;
  summary: Partial<Record<Locale, string>>;
};

export function readItems(id: string): ItemSource[] {
  const file = `${topicDir(id)}/items.txt`;
  const out: ItemSource[] = [];
  for (const block of readFileSync(file, "utf8").split(/\n\s*\n/)) {
    const ls = block.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
    const head = ls.find((l) => l.startsWith("@"));
    if (!head) continue;
    const item = head.slice(1).trim();
    const get = (k: string) => ls.find((l) => l.startsWith(`${k}:`))?.slice(k.length + 1).trim();
    const fail = (msg: string) => {
      throw new Error(`content/topics/${id}/items.txt [${item}] ${msg}`);
    };
    const [a, b = a] = (get("when") ?? fail("when 필요")!).split("~").map((s) => s.trim());
    const pair = (v: string) => {
      const [lon, lat] = v.split(",").map((s) => Number(s.trim()));
      if (!(Math.abs(lon) <= 180 && Math.abs(lat) <= 90)) fail(`좌표 오류: ${v}`);
      return [lon, lat] as [number, number];
    };
    const spread = (get("spread") ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const m = s.match(/^(-?\d+(?:-\d{2})?)\s+(.+)$/);
        if (!m) fail(`spread 형식 오류("시기 경도, 위도"): ${s}`);
        return { t: toMonth(m![1]), coords: pair(m![2]) };
      })
      .sort((x, y) => x.t - y.t);
    const localized = (prefix: string) =>
      Object.fromEntries(
        LOCALES.filter((l) => get(`${prefix}.${l}`)).map((l) => [l, get(`${prefix}.${l}`)!]),
      );
    const start = toMonth(a, "start");
    out.push({
      id: item,
      wikipedia: get("wikipedia") ?? fail("wikipedia 필요")!,
      start,
      end: Math.max(start, toMonth(b, "end")),
      approx: get("precision") === "approx",
      coords: pair(get("coords") ?? fail("coords 필요")!),
      spread,
      importance: Number(get("importance") ?? 3),
      title: localized("title"),
      summary: localized("summary"),
    });
  }
  return out.sort((x, y) => x.start - y.start);
}
