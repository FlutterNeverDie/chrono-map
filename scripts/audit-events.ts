/**
 * 사건 검수: npm run audit
 * content/events의 사건을 Wikidata(시작·끝·시점 날짜, 좌표)와 위키백과 요약에 대어 보고
 * 의심스러운 항목을 목록으로 출력한다. 아무것도 고치지 않는다 — 사람이 보고 content/events를 고친다.
 * Wikidata 응답은 data-raw/audit-wikidata.json에 캐시(다시 받으려면 -- --fresh).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getJson, sleep } from "./lib/wikipediaApi";
import { readEvents, root } from "./lib/content";
import { regionOf } from "./lib/regionOf";

type Claim = {
  mainsnak: {
    datavalue?: {
      value: { time?: string; latitude?: number; longitude?: number };
    };
  };
  rank: string;
};
type Entity = { claims?: Record<string, Claim[]> };

const CACHE = root("data-raw/audit-wikidata.json");
const wiki = JSON.parse(
  readFileSync(root("content/wikipedia.json"), "utf8"),
) as Record<
  string,
  { qid?: string; pages: Record<string, { extract: string }> }
>;

async function entities(qids: string[]): Promise<Record<string, Entity>> {
  const cache: Record<string, Entity> =
    !process.argv.includes("--fresh") && existsSync(CACHE)
      ? JSON.parse(readFileSync(CACHE, "utf8"))
      : {};
  const todo = qids.filter((q) => !cache[q]);
  for (let i = 0; i < todo.length; i += 50) {
    const ids = todo.slice(i, i + 50).join("|");
    const res = await getJson<{ entities: Record<string, Entity> }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${ids}`,
    );
    Object.assign(cache, res?.entities ?? {});
    await sleep(300);
  }
  mkdirSync(root("data-raw"), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache));
  return cache;
}

/** "+1592-04-13T00:00:00Z" → 1592, "-0221-…" → -221 */
function year(e: Entity, prop: string): number | null {
  const claims = (e.claims?.[prop] ?? []).filter(
    (c) => c.rank !== "deprecated",
  );
  const best = claims.find((c) => c.rank === "preferred") ?? claims[0];
  const t = best?.mainsnak.datavalue?.value.time;
  if (!t) return null;
  const y = Number(/^([+-]\d+)/.exec(t)?.[1]);
  return Number.isFinite(y) && y !== 0 ? y : null;
}

function coords(e: Entity): [number, number] | null {
  const v = e.claims?.P625?.[0]?.mainsnak.datavalue?.value;
  return v?.latitude != null ? [v.longitude!, v.latitude] : null;
}

function km([lon1, lat1]: number[], [lon2, lat2]: number[]): number {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) *
      Math.cos(lat2 * r) *
      Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/** 시대별 허용 오차(년) */
const tolerance = (y: number) => (y < 0 ? 30 : y < 1000 ? 5 : y < 1800 ? 2 : 1);

async function main() {
  const { events } = readEvents();
  const qids = [
    ...new Set(
      events
        .map((e) => (e.wikipedia ? wiki[e.wikipedia]?.qid : undefined))
        .filter(Boolean),
    ),
  ] as string[];
  const data = await entities(qids);

  const issues: Record<string, string[]> = {};
  const add = (kind: string, line: string) => (issues[kind] ??= []).push(line);
  const seen = new Map<string, string>();

  for (const e of events) {
    const w = e.wikipedia ? wiki[e.wikipedia] : undefined;
    const ent = w?.qid ? data[w.qid] : undefined;
    const when = e.start === e.end ? `${e.start}` : `${e.start} ~ ${e.end}`;

    if (e.wikipedia) {
      if (seen.has(e.wikipedia))
        add("중복 문서", `${e.id} = ${seen.get(e.wikipedia)} (${e.wikipedia})`);
      seen.set(e.wikipedia, e.id);
      const extract = w?.pages.en?.extract ?? "";
      if (!w?.pages.en) add("영어 위키 없음", `${e.id} (${e.wikipedia})`);
      if (/may refer to|refers to:/i.test(extract))
        add("동음이의 문서", `${e.id} (${e.wikipedia})`);
      if (!w?.pages.ko) add("한국어 위키 없음", `${e.id} (${e.wikipedia})`);
    }

    if (ent) {
      const start = year(ent, "P580") ?? year(ent, "P585") ?? year(ent, "P571");
      const end = year(ent, "P582") ?? year(ent, "P576");
      const tol = tolerance(e.start);
      if (start != null && Math.abs(start - e.start) > tol)
        add(
          "시작 연도 다름",
          `${e.id}: ${when}  ← Wikidata 시작 ${start}${end ? ` 끝 ${end}` : ""}`,
        );
      if (e.end !== e.start && end != null && Math.abs(end - e.end) > tol)
        add("끝 연도 다름", `${e.id}: ${when}  ← Wikidata 끝 ${end}`);
      const c = coords(ent);
      if (c) {
        const d = km(e.coords, c);
        if (d > 800)
          add(
            "좌표 멂(800km+)",
            `${e.id}: [${e.coords}] ← Wikidata [${c.map((v) => v.toFixed(2))}] ${Math.round(d)}km`,
          );
      }
    }

    if (e.end - e.start > 40 && e.precision === "year")
      add("긴 기간(40년+)", `${e.id}: ${when} (${e.category})`);
    if (regionOf(...e.coords) !== e.region)
      add(
        "지역·좌표 불일치(참고)",
        `${e.id}: ${e.region} / 좌표상 ${regionOf(...e.coords)}`,
      );
  }

  for (const [kind, lines] of Object.entries(issues)) {
    console.log(`\n## ${kind} (${lines.length})`);
    for (const l of lines) console.log(`- ${l}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
