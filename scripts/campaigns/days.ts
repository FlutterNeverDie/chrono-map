/**
 * 전투 날짜(일 단위) 받기: npm run wars:days [-- <id> …] [--dry]
 *
 * battles.txt·extra-battles.txt의 위키백과 문서마다 Wikidata 시작·끝 날짜(P580·P582, 하루짜리는 P585)를 읽어
 * 일까지 있으면 `days: 1916-07-01 ~ 1916-11-18`(하루면 `days: 1914-08-17`) 줄을 when 아래에 넣는다(있으면 바꾼다).
 * - 일 정밀도(11)인 날짜만. 끝 날짜가 일까지 없으면 시작 하루만.
 * - 율리우스력으로 적힌 1583년 이후 날짜는 그레고리력으로 바꾼다(그 전은 적힌 그대로 - 역사책 표기).
 * - 기원전은 넣지 않는다.
 * - when과 달(연 단위 전쟁은 해)이 맞지 않으면 넣지 않고 알린다(when을 사람이 고친 경우 - 어느 쪽이 맞는지 확인).
 * battles.txt를 `wars:fetch -- <id> --list`로 다시 만들면 days가 사라지므로 이 명령을 다시 돌린다.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getJson, sleep } from "../lib/wikipediaApi";
import { dirOf, listCampaigns, readTheme, type Unit } from "./lib";

type Time = { time: string; precision: number; calendarmodel: string };
type Claim = { mainsnak: { datavalue?: { value: Time } } };
type Entity = {
  claims?: Record<string, Claim[]>;
  sitelinks?: { enwiki?: { title: string } };
};

const JULIAN = "http://www.wikidata.org/entity/Q1985786";

/** 율리우스력 날짜 → 그레고리력(율리우스 일 번호를 거쳐) */
function julianToGregorian(
  y: number,
  m: number,
  d: number,
): [number, number, number] {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn =
    d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
  const b = jdn + 32044;
  const c = Math.floor((4 * b + 3) / 146097);
  const e = b - Math.floor((146097 * c) / 4);
  const f = Math.floor((4 * e + 3) / 1461);
  const g = e - Math.floor((1461 * f) / 4);
  const h = Math.floor((5 * g + 2) / 153);
  return [
    100 * c + f - 4800 + Math.floor(h / 10),
    h + 3 - 12 * Math.floor(h / 10),
    g - Math.floor((153 * h + 2) / 5) + 1,
  ];
}

/** Wikidata 시간 → "YYYY-MM-DD"(일 정밀도·서기만, 아니면 null) */
function day(v: Time | undefined): string | null {
  if (!v || v.precision < 11) return null;
  const m = /^([+-])(\d+)-(\d{2})-(\d{2})/.exec(v.time);
  if (!m || m[1] === "-") return null;
  let [y, mo, d] = [Number(m[2]), Number(m[3]), Number(m[4])];
  if (!y || !mo || !d) return null;
  if (v.calendarmodel === JULIAN && y >= 1583)
    [y, mo, d] = julianToGregorian(y, mo, d);
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 영어 문서 제목들 → [시작일, 끝일|null] */
async function daysOf(
  titles: string[],
): Promise<Map<string, [string, string | null]>> {
  const out = new Map<string, [string, string | null]>();
  for (let i = 0; i < titles.length; i += 50) {
    const res = await getJson<{ entities: Record<string, Entity> }>(
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&sitefilter=enwiki&sites=enwiki&titles=" +
        encodeURIComponent(titles.slice(i, i + 50).join("|")),
    );
    for (const e of Object.values(res?.entities ?? {})) {
      const title = e.sitelinks?.enwiki?.title;
      const value = (p: string) =>
        e.claims?.[p]?.[0]?.mainsnak.datavalue?.value;
      const start = day(value("P580")) ?? day(value("P585"));
      if (title && start) out.set(title, [start, day(value("P582"))]);
    }
    await sleep(300);
  }
  return out;
}

/** when의 시작·끝(unit 형식)과 날짜가 같은 달(연 단위면 해)인지 */
const sameSpan = (when: string, date: string, unit: Unit) =>
  unit === "month"
    ? date.startsWith(when)
    : date.slice(0, 4) === when.padStart(4, "0");

async function main() {
  const dry = process.argv.includes("--dry");
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  let total = 0;
  for (const id of args.length ? args : listCampaigns()) {
    const { unit } = readTheme(id);
    for (const file of ["battles.txt", "extra-battles.txt"]) {
      const path = `${dirOf(id)}/${file}`;
      if (!existsSync(path)) continue;
      const blocks = readFileSync(path, "utf8").split(/\n(?=@ )/);
      const titles = blocks.flatMap(
        (b) => /^wikipedia: (.+)$/m.exec(b)?.[1] ?? [],
      );
      if (!titles.length) continue;
      const found = await daysOf(titles);
      const odd: string[] = [];
      let n = 0;
      const out = blocks.map((b) => {
        const title = /^wikipedia: (.+)$/m.exec(b)?.[1];
        const when = /^when: (.+)$/m.exec(b)?.[1];
        const d = title && found.get(title);
        if (!d || !when) return b;
        const [w0, w1 = w0] = when.split("~").map((s) => s.trim());
        let [start, end] = d;
        if (!sameSpan(w0, start, unit)) {
          odd.push(`${title}: when ${when}, Wikidata ${start}`);
          return b;
        }
        // 끝 날짜가 when 끝과 어긋나거나 시작보다 앞서면 시작 하루만
        if (end && (end < start || !sameSpan(w1, end, unit))) end = null;
        const line = `days: ${end && end !== start ? `${start} ~ ${end}` : start}`;
        n++;
        return /^days: .+$/m.test(b)
          ? b.replace(/^days: .+$/m, line)
          : b.replace(/^(when: .+)$/m, `$1\n${line}`);
      });
      total += n;
      if (!dry) writeFileSync(path, out.join("\n"));
      console.log(
        `  ${id}/${file}: ${n}/${titles.length}건 날짜${dry ? " (미리보기)" : ""}`,
      );
      for (const o of odd) console.log(`    when과 달이 다름(넣지 않음) ${o}`);
    }
  }
  console.log(`날짜 넣은 전투 ${total}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
