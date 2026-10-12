// content/campaigns → src/data/generated/campaigns.json (네트워크 없음, dev/build 전에 자동)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { root } from "../lib/content";
import { dirOf, listCampaigns, readBattles, readSides, readTheme } from "./lib";

const campaigns = listCampaigns().map((id) => {
  const theme = readTheme(id);
  const wikiFile = `${dirOf(id)}/wikipedia.json`;
  const wiki = existsSync(wikiFile) ? JSON.parse(readFileSync(wikiFile, "utf8")) : {};
  const battles = readBattles(id, theme.unit)
    .filter((b) => b.end >= theme.start && b.start <= theme.end)
    .map((b) => ({ ...b, wiki: wiki[b.wikipedia]?.pages ?? {} }));
  const borderYears: number[] = [];
  for (let y = theme.startYear; y <= theme.endYear; y += theme.bordersStep) borderYears.push(y === 0 ? 1 : y);
  if (borderYears.at(-1) !== theme.endYear) borderYears.push(theme.endYear);
  const missing = battles.filter((b) => !wiki[b.wikipedia]).length;
  console.log(`  ${id}: 전투 ${battles.length}건${missing ? ` (요약 없음 ${missing} → npm run wars:fetch)` : ""}`);
  return {
    ...theme,
    wiki: wiki[theme.wikipedia]?.pages ?? {},
    battles,
    sideRules: readSides(id, theme.unit),
    borderYears,
  };
});

mkdirSync(root("src/data/generated"), { recursive: true });
writeFileSync(root("src/data/generated/campaigns.json"), JSON.stringify(campaigns));
// 목록(대화상자·목록 페이지)용 작은 색인 — 화면 어디서나 불러도 가볍게
writeFileSync(
  root("src/data/generated/campaign-index.json"),
  JSON.stringify(
    campaigns.map((c) => ({
      id: c.id,
      region: c.region,
      wikipedia: c.wikipedia,
      titles: Object.fromEntries(Object.entries(c.wiki).map(([l, p]) => [l, (p as { title: string }).title])),
      unit: c.unit,
      start: c.start,
      end: c.end,
      battles: c.battles.length,
    })),
  ),
);
console.log(`전쟁 지도 ${campaigns.length}개 → src/data/generated/campaigns.json`);
