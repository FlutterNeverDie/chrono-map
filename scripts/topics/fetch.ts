// 주제 지도 항목의 위키백과 요약(8개 언어) 받기 — 결과는 content/topics/<id>/wikipedia.json에 캐시
//   npm run topics:fetch              모든 주제 지도의 빠진 요약만
//   npm run topics:fetch -- epidemics 특정 지도만
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fetchSummaries } from "../lib/wikipediaApi";
import { listTopics, readItems, topicDir } from "./lib";

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  for (const id of args.length ? args : listTopics()) {
    const file = `${topicDir(id)}/wikipedia.json`;
    const cache = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    const todo = [...new Set(readItems(id).map((i) => i.wikipedia))].filter((t) => !cache[t]);
    if (!todo.length) continue;
    console.log(`  ${id}: 위키백과 요약 ${todo.length}건 받는 중…`);
    await fetchSummaries(todo, (title, pages) => {
      cache[title] = { pages };
      if (!Object.keys(pages).length) console.log(`    ! "${title}": 영어 위키백과 문서를 찾지 못함`);
    });
    writeFileSync(file, JSON.stringify(cache, null, 2) + "\n");
  }
  console.log("완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
