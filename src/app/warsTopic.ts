import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { LOCALES } from "@/i18n/locales";
import { CAMPAIGNS } from "@/features/campaign/data";
import type { Topic } from "@/features/topic";

/**
 * 전쟁 지도 첫 화면(/wars): 모든 전쟁을 주제 지도 하나처럼 보여준다(서버에서만).
 * 전쟁 = 항목(기간·대표 위치), 항목을 고르면 "전쟁 지도로 보기"로 그 전쟁 지도에 들어간다.
 * 전쟁 지도·주제 지도 기능은 서로 모르고, 둘을 잇는 일은 화면 조립(app)이 맡는다.
 */
export function warsTopic(): Topic {
  const all = (pick: (l: Locale) => string) =>
    Object.fromEntries(LOCALES.map((l) => [l, pick(l)]));
  return {
    id: "wars",
    order: 0,
    mode: "span",
    scale: [-300, 300, 1200, 1500, 1800, 1900, 1950, 1980],
    showMonthFrom: 1900,
    view: { lon: 60, lat: 30, zoom: 1 },
    color: "#b4232a",
    title: all((l) => getMessages(l).wars.tab),
    description: all((l) => getMessages(l).wars.indexDescription),
    linkLabel: all((l) => getMessages(l).wars.openMap),
    items: CAMPAIGNS.map((c) => {
      const month = (t: number, edge: 0 | 11) =>
        c.unit === "month" ? t : t * 12 + edge;
      // 중요도: 위키백과 언어판이 많은 전투가 많을수록 큰 전쟁
      const big = c.battles.filter((b) => b.links >= 30).length;
      return {
        id: c.id,
        wikipedia: c.wikipedia,
        start: month(c.start, 0),
        end: month(c.end, 11),
        approx: false,
        coords: [c.view.lon, c.view.lat] as [number, number],
        spread: [],
        importance: big >= 20 ? 5 : big >= 5 ? 4 : 3,
        wiki: c.wiki,
        link: `wars/${c.id}`,
      };
    }),
  };
}
