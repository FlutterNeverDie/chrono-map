// content/campaigns → src/data/generated/campaigns.json (네트워크 없음, dev/build 전에 자동)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { root } from "../lib/content";
import { tidyPages, withoutOwn } from "../lib/wikipedia";
import { dirOf, listCampaigns, readBattles, readSides, readTheme } from "./lib";
import { LOCALES } from "../../src/i18n/locales";
import { formatDayRange } from "../../src/lib/year";
import {
  battleTitle,
  formatBattleWhen,
} from "../../src/features/campaign/logic";
import type { Campaign } from "../../src/features/campaign/types";

const campaigns = listCampaigns().map((id) => {
  const theme = readTheme(id);
  const wikiFile = `${dirOf(id)}/wikipedia.json`;
  const wiki = existsSync(wikiFile)
    ? JSON.parse(readFileSync(wikiFile, "utf8"))
    : {};
  const battles = readBattles(id, theme.unit)
    .filter((b) => b.end >= theme.start && b.start <= theme.end)
    // 위키백과 문서가 없는 전투(직접 쓴 title·summary만)는 wiki가 비어 출처 표기도 붙지 않는다.
    // summary.<언어>를 직접 쓴 언어는 그 언어 위키백과 요약을 쓰지 않는다(예: 영어 문서가 요새 문서로 넘어감)
    .map((b) => ({
      ...b,
      ...withoutOwn(
        b.wikipedia ? tidyPages(wiki[b.wikipedia]?.pages ?? {}) : {},
        b.summary,
        b.title,
      ),
      // 일 단위 날짜 글자는 여기서 한 번(서버·브라우저가 같은 글자 - campaign types.ts daysText)
      ...(b.days
        ? {
            daysText: Object.fromEntries(
              LOCALES.map((l) => [
                l,
                formatDayRange(b.days![0], b.days![1], l),
              ]),
            ),
          }
        : {}),
    }));
  const borderYears: number[] = [];
  for (let y = theme.startYear; y <= theme.endYear; y += theme.bordersStep)
    borderYears.push(y === 0 ? 1 : y);
  if (borderYears.at(-1) !== theme.endYear) borderYears.push(theme.endYear);
  const missing = battles.filter(
    (b) => b.wikipedia && !wiki[b.wikipedia],
  ).length;
  // theme.txt에 summary.<언어>를 직접 쓴 언어는 그 언어 위키백과 요약을 쓰지 않는다(예: 영어 문서가 동음이의어 문서)
  const war = withoutOwn(
    tidyPages(wiki[theme.wikipedia]?.pages ?? {}),
    theme.summary,
    theme.title,
  );
  console.log(
    `  ${id}: 전투 ${battles.length}건${missing ? ` (요약 없음 ${missing} → npm run wars:fetch)` : ""}`,
  );
  return {
    ...theme,
    ...war,
    battles,
    sideRules: readSides(id, theme.unit),
    borderYears,
  };
});

mkdirSync(root("src/data/generated"), { recursive: true });
writeFileSync(
  root("src/data/generated/campaigns.json"),
  JSON.stringify(campaigns),
);
// 목록(대화상자·목록 페이지)용 작은 색인 — 화면 어디서나 불러도 가볍게
writeFileSync(
  root("src/data/generated/campaign-index.json"),
  JSON.stringify(
    campaigns.map((c) => ({
      id: c.id,
      region: c.region,
      wikipedia: c.wikipedia,
      titles: {
        ...Object.fromEntries(
          Object.entries(c.wiki).map(([l, p]) => [
            l,
            (p as { title: string }).title,
          ]),
        ),
        ...c.title,
      },
      unit: c.unit,
      start: c.start,
      end: c.end,
      battles: c.battles.length,
    })),
  ),
);
console.log(
  `전쟁 지도 ${campaigns.length}개 → src/data/generated/campaigns.json`,
);

// 전쟁 지도 첫 화면(/wars)의 전투 점: 언어별 작은 파일(public/campaigns/points/<언어>.json) - 페이지 HTML에 넣지 않고 지도가 따로 받는다.
// { items: 전쟁 id[], points: [전쟁 번호, 전투 id, 시작 월, 끝 월, 경도, 위도, 이름, 때(그 언어 표기)][] } - 월 = 연×12 + 월−1
mkdirSync(root("public/campaigns/points"), { recursive: true });
for (const locale of LOCALES) {
  const points = (campaigns as unknown as Campaign[]).flatMap((c, i) =>
    c.battles.map((b) => [
      i,
      b.id,
      c.unit === "month" ? b.start : b.start * 12,
      c.unit === "month" ? b.end : b.end * 12 + 11,
      b.coords[0],
      b.coords[1],
      battleTitle(b, locale),
      formatBattleWhen(b, c, locale),
    ]),
  );
  writeFileSync(
    root(`public/campaigns/points/${locale}.json`),
    JSON.stringify({ items: campaigns.map((c) => c.id), points }),
  );
}
console.log(
  `전투 점 ${campaigns.reduce((n, c) => n + c.battles.length, 0)}개 → public/campaigns/points/<언어>.json`,
);
