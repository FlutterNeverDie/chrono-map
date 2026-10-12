// content/ (사람·AI가 편집하는 텍스트) → src/data/generated/content.json (앱이 읽는 데이터)
//
//   content/events/<지역id>.txt     사건. 파일 이름이 곧 지역
//   content/rankings/<시점id>.txt   시점별 중요한 사건 순서 (사건 id 목록)
//
// 형식은 content/CLAUDE.md. 오류가 있으면 "파일:줄" 목록을 출력하고 실패한다.
// 지역·시점·언어·카테고리 목록은 앱 코드(src/)를 그대로 가져와 검증한다(목록을 두 곳에 두지 않는다).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REGIONS } from "../src/data/regions";
import { VIEWPOINTS } from "../src/data/viewpoints";
import { CATEGORIES } from "../src/data/categories";
import { LOCALES } from "../src/i18n/locales";
import type {
  Content,
  HistoryEvent,
  Localized,
  Precision,
  Rankings,
  RegionId,
  ViewpointId,
} from "../src/lib/types";

const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const EVENTS_DIR = root("content/events");
const RANKINGS_DIR = root("content/rankings");
const OUT_DIR = root("src/data/generated");

const PRECISIONS: Precision[] = ["year", "decade", "century"];
const TEXT_FIELDS = ["title", "place", "summary"] as const;
const REQUIRED = ["when", "coords", "category", "importance"] as const;

const errors: string[] = [];
const txtFiles = (dir: string) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .sort();

/** "1492" | "1592 ~ 1598" | "-221" | "-500 ~ -300" */
function parseWhen(value: string): [number, number] | string {
  const parts = value.split("~").map((s) => s.trim());
  if (parts.length > 2) return `"시작 ~ 끝" 형식이 아님: ${value}`;
  const years = parts.map(Number);
  if (years.some((y) => !Number.isInteger(y) || y === 0))
    return `연도는 0이 아닌 정수: ${value}`;
  const [start, end = start] = years;
  if (end < start) return `끝 연도가 시작보다 빠름: ${value}`;
  return [start, end];
}

// ── 사건 ──────────────────────────────────────────────
const events: HistoryEvent[] = [];
const regionIds = new Set<string>(REGIONS.map((r) => r.id));

for (const file of txtFiles(EVENTS_DIR)) {
  const region = basename(file, ".txt");
  if (!regionIds.has(region)) {
    errors.push(
      `${file}: 파일 이름이 지역 id가 아님 (${[...regionIds].join(", ")})`,
    );
    continue;
  }

  type Draft = Partial<HistoryEvent> & {
    id: string;
    line: number;
    seen: Set<string>;
  };
  let draft: Draft | null = null;
  const fail = (line: number, msg: string) =>
    errors.push(`content/events/${file}:${line}  ${msg}`);

  const finish = () => {
    if (!draft) return;
    const d = draft;
    draft = null;
    for (const key of REQUIRED)
      if (!d.seen.has(key)) fail(d.line, `[${d.id}] ${key} 없음`);
    for (const f of TEXT_FIELDS)
      if (!d[f]?.ko) fail(d.line, `[${d.id}] ${f}.ko 없음 (한국어 필수)`);
    if (!d.sources?.length) fail(d.line, `[${d.id}] source 없음`);
    if (events.some((e) => e.id === d.id))
      fail(d.line, `[${d.id}] 다른 파일과 id 중복`);
    const {
      id,
      start,
      end,
      precision,
      region,
      coords,
      category,
      importance,
      title,
      place,
      summary,
      sources,
    } = d;
    events.push({
      id,
      start,
      end,
      precision,
      region,
      coords,
      category,
      importance,
      title,
      place,
      summary,
      sources,
    } as HistoryEvent);
  };

  readFileSync(join(EVENTS_DIR, file), "utf8")
    .split("\n")
    .forEach((raw, i) => {
      const n = i + 1;
      const text = raw.trim();
      if (!text) return finish();
      if (text.startsWith("#")) return;
      if (text.startsWith("@")) {
        finish();
        const id = text.slice(1).trim();
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))
          fail(n, `id는 영문 소문자 kebab-case: "${id}"`);
        draft = {
          id,
          line: n,
          seen: new Set(),
          region: region as RegionId,
          precision: "year",
          title: {} as Localized,
          place: {} as Localized,
          summary: {} as Localized,
          sources: [],
        };
        return;
      }
      if (!draft) return fail(n, "사건은 '@ id' 줄로 시작해야 합니다");
      const d: Draft = draft;

      const colon = text.indexOf(":");
      if (colon < 0) return fail(n, `"키: 값" 형식이 아님: ${text}`);
      const key = text.slice(0, colon).trim();
      const value = text.slice(colon + 1).trim();
      d.seen.add(key);

      const [field, locale] = key.split(".");
      if ((TEXT_FIELDS as readonly string[]).includes(field)) {
        if (!(LOCALES as string[]).includes(locale))
          return fail(n, `지원하지 않는 언어: ${key}`);
        (d[field as (typeof TEXT_FIELDS)[number]] as Record<string, string>)[
          locale
        ] = value;
        return;
      }

      switch (key) {
        case "when": {
          const r = parseWhen(value);
          if (typeof r === "string") return fail(n, r);
          [d.start, d.end] = r;
          break;
        }
        case "precision":
          if (!PRECISIONS.includes(value as Precision))
            return fail(n, `precision: ${PRECISIONS.join(" | ")}`);
          d.precision = value as Precision;
          break;
        case "category":
          if (!(CATEGORIES as string[]).includes(value))
            return fail(n, `알 수 없는 카테고리: ${value}`);
          d.category = value as HistoryEvent["category"];
          break;
        case "importance": {
          const v = Number(value);
          if (![1, 2, 3, 4, 5].includes(v)) return fail(n, "importance는 1~5");
          d.importance = v as HistoryEvent["importance"];
          break;
        }
        case "coords": {
          const [lon, lat] = value.split(",").map((s) => Number(s.trim()));
          if (!(Math.abs(lon) <= 180 && Math.abs(lat) <= 90))
            return fail(n, `coords는 "경도, 위도": ${value}`);
          d.coords = [lon, lat];
          break;
        }
        case "source":
          d.sources!.push(value);
          break;
        default:
          fail(n, `알 수 없는 키: ${key}`);
      }
    });
  finish();
}
events.sort((a, b) => a.start - b.start || a.end - b.end);

// ── 시점별 순서 ───────────────────────────────────────
const rankings: Rankings = {};
const eventIds = new Set(events.map((e) => e.id));
const viewpointIds = new Set<string>(VIEWPOINTS.map((v) => v.id));

for (const file of txtFiles(RANKINGS_DIR)) {
  const viewpoint = basename(file, ".txt");
  if (!viewpointIds.has(viewpoint)) {
    errors.push(
      `${file}: 파일 이름이 시점 id가 아님 (${[...viewpointIds].join(", ")})`,
    );
    continue;
  }
  const ids: string[] = [];
  readFileSync(join(RANKINGS_DIR, file), "utf8")
    .split("\n")
    .forEach((raw, i) => {
      const id = raw.trim();
      if (!id || id.startsWith("#")) return;
      if (!eventIds.has(id))
        errors.push(`content/rankings/${file}:${i + 1}  없는 사건 id: ${id}`);
      else if (ids.includes(id))
        errors.push(`content/rankings/${file}:${i + 1}  중복: ${id}`);
      else ids.push(id);
    });
  if (ids.length) rankings[viewpoint as ViewpointId] = ids;
}

if (errors.length) {
  console.error(`콘텐츠 오류 ${errors.length}건\n${errors.join("\n")}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const content: Content = { events, rankings };
writeFileSync(join(OUT_DIR, "content.json"), JSON.stringify(content));
console.log(
  `사건 ${events.length}건, 시점별 순서 ${Object.keys(rankings).length}개 → src/data/generated/content.json`,
);
