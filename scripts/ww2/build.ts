// content/ww2 → src/data/generated/ww2.json (네트워크 없음, dev/build 전에 자동)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { root } from "../lib/content";
import { WIKI_FILE, monthIndex, readBattles, readSides } from "./lib";

const FIRST = monthIndex("1937-07"); // 노구교 사건(중일전쟁 시작)
const LAST = monthIndex("1945-09"); // 일본 항복 조인

const wiki = existsSync(WIKI_FILE)
  ? JSON.parse(readFileSync(WIKI_FILE, "utf8"))
  : {};
const battles = readBattles()
  .filter((b) => b.end >= FIRST && b.start <= LAST)
  .map((b) => ({ ...b, wiki: wiki[b.wikipedia]?.pages ?? {} }));
const missing = battles.filter((b) => !wiki[b.wikipedia]).length;

mkdirSync(root("src/data/generated"), { recursive: true });
writeFileSync(
  root("src/data/generated/ww2.json"),
  JSON.stringify({ first: FIRST, last: LAST, battles, sides: readSides() }),
);
console.log(
  `2차대전 전투 ${battles.length}건${missing ? ` (위키백과 요약 없음 ${missing}건 → npm run ww2:fetch)` : ""} → src/data/generated/ww2.json`,
);
