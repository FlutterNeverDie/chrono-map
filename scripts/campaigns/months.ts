/**
 * 전투 월 바로잡기: npm run wars:months [-- <id> …] [--dry]
 *
 * Wikidata 날짜가 "연"까지만 있으면 자동 생성(battles.txt)이 1월로 적는다(예: 1861-01).
 * 1월로 적힌 전투마다 Wikidata 날짜 정밀도를 확인하고, 연까지만 있으면
 * 위키백과 영어 요약 첫 문장의 날짜("fought on 21 July 1861")에서 월을 읽어 when을 고친다.
 * 월을 못 찾으면 고치지 않고 목록으로 알린다(사람이 확인). unit이 month인 전쟁만 대상.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getJson, sleep } from "../lib/wikipediaApi";
import { dirOf, listCampaigns, readTheme } from "./lib";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Claim = {
  mainsnak: { datavalue?: { value: { time: string; precision: number } } };
};
type Entity = {
  claims?: Record<string, Claim[]>;
  sitelinks?: { enwiki?: { title: string } };
};

/** 영어 문서 제목들 → 시작 날짜 정밀도(11 일, 10 월, 9 연) */
async function precisions(titles: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < titles.length; i += 40) {
    const res = await getJson<{ entities: Record<string, Entity> }>(
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&sitefilter=enwiki&sites=enwiki&titles=" +
        encodeURIComponent(titles.slice(i, i + 40).join("|")),
    );
    for (const e of Object.values(res?.entities ?? {})) {
      const title = e.sitelinks?.enwiki?.title;
      const claim = (e.claims?.P580 ?? e.claims?.P585)?.[0];
      const p = claim?.mainsnak.datavalue?.value.precision;
      if (title && p != null) out.set(title, p);
    }
    await sleep(300);
  }
  return out;
}

/** 요약에서 그 해의 첫 월 이름(1~12). "21 July 1861", "July 21, 1861", "July 1861" */
function monthIn(text: string, year: number): number | null {
  const re = new RegExp(
    `(${MONTHS.join("|")})(?:\\s+\\d{1,2})?,?\\s+(?:\\d{1,2}\\s*[–-]\\s*\\d{1,2}\\s+\\w+\\s+)?${year}`,
  );
  const m =
    re.exec(text) ??
    new RegExp(`\\d{1,2}\\s+(${MONTHS.join("|")})\\s+${year}`).exec(text);
  return m ? MONTHS.indexOf(m[1]) + 1 : null;
}

async function main() {
  const dry = process.argv.includes("--dry");
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  for (const id of args.length ? args : listCampaigns()) {
    const theme = readTheme(id);
    if (theme.unit !== "month") continue;
    const wikiFile = `${dirOf(id)}/wikipedia.json`;
    const wiki = existsSync(wikiFile)
      ? JSON.parse(readFileSync(wikiFile, "utf8"))
      : {};
    for (const file of ["battles.txt", "extra-battles.txt"]) {
      const path = `${dirOf(id)}/${file}`;
      if (!existsSync(path)) continue;
      const text = readFileSync(path, "utf8");
      const blocks = text.split(/\n(?=@ )/);
      const january = blocks
        .map((b) => ({
          b,
          title: /^wikipedia: (.+)$/m.exec(b)?.[1],
          when: /^when: (\d{4})-01(?: ~ (\d{4})-(\d{2}))?$/m.exec(b),
        }))
        .filter((x) => x.title && x.when);
      if (!january.length) continue;
      const prec = await precisions(january.map((x) => x.title!));
      const fixed: string[] = [];
      const unsure: string[] = [];
      const out = blocks.map((b) => {
        const x = january.find((j) => j.b === b);
        if (!x) return b;
        const p = prec.get(x.title!);
        if (p == null || p >= 10) return b; // 정말 1월이거나 정밀도를 모름 → 그대로
        const year = Number(x.when![1]);
        const extract: string = wiki[x.title!]?.pages?.en?.extract ?? "";
        const month = monthIn(extract, year);
        if (!month) {
          unsure.push(x.title!);
          return b;
        }
        const start = `${year}-${String(month).padStart(2, "0")}`;
        // 끝이 있으면 유지(시작보다 앞서면 시작 한 달로)
        const end = x.when![2] ? `${x.when![2]}-${x.when![3]}` : null;
        const when = end && end > start ? `${start} ~ ${end}` : start;
        fixed.push(`${x.title}: ${x.when![0].slice(6)} → ${when}`);
        return b.replace(/^when: .+$/m, `when: ${when}`);
      });
      if (fixed.length && !dry) writeFileSync(path, out.join("\n"));
      for (const f of fixed)
        console.log(`  ${id} ${dry ? "(고칠 것)" : "고침"} ${f}`);
      for (const u of unsure)
        console.log(`  ${id} 확인 필요(요약에 월 없음): ${u}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
