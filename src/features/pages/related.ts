import { geoDistance } from "d3-geo";
import type { HistoryEvent, Locale } from "@/lib/types";
import { EVENTS } from "@/data/content";
import { landName, landRuns } from "@/data/lands";
import { markersIn } from "@/data/mapMarkers";

/**
 * 상세 페이지(사건·주제 지도 항목·전쟁)의 "더 보기" 내용. 서버(빌드)에서만 쓴다.
 * - 이 땅의 앞뒤 사건: 가까운 곳(먼저 NEAR_KM, 사건이 적으면 FAR_KM, 그래도 적으면 가장 가까운 NEAREST개)에서
 *   일어난 본 지도 사건 중 시기가 가장 가까운 앞 3개·뒤 3개 - 모든 상세 페이지에 나오게
 * - 이 땅을 다스린 나라: 국경 스냅샷에서 그 자리가 속한 나라의 차례(data/lands, 열쇠 = 상세 페이지 경로).
 *   그 언어 이름이 같은 이웃은 합친다(Great Britain → United Kingdom은 한국어로 둘 다 "영국")
 * - 이 시기의 다른 지도: 기간과 겹치는 전쟁·주제 지도(이 페이지가 속한 지도는 빼고)
 */
const EARTH_KM = 6371;
const NEAR_KM = 500;
const FAR_KM = 1000;
const SIDE = 3;
const NEAREST = 2 * SIDE;

export type RelatedInput = {
  /** 상세 페이지 경로(언어 접두사 제외) - 나라 차례의 열쇠, 오류 제보 주소 */
  path: string;
  coords: [number, number];
  /** 기간(연도) */
  start: number;
  end: number;
  /** 이 페이지가 본 지도 사건이면 그 id(앞뒤 사건에서 뺀다) */
  eventId?: string;
  /** 이 페이지가 속한 지도 경로(다른 지도 목록에서 뺀다) */
  mapPath?: string;
};

/** 화면에 보일 나라 한 줄. to가 null이면 마지막 스냅샷까지 이어짐 */
export type LandRow = { name: string; from: number; to: number | null };

export type Related = {
  before: HistoryEvent[];
  after: HistoryEvent[];
  lands: LandRow[];
  /** lands에서 시작 연도를 다스린 나라의 순번(없으면 -1) */
  landNow: number;
  maps: ReturnType<typeof markersIn>;
};

export function relatedFor(input: RelatedInput, locale: Locale): Related {
  const km = new Map(
    EVENTS.map((o) => [o, geoDistance(input.coords, o.coords) * EARTH_KM]),
  );
  const others = EVENTS.filter((o) => o.id !== input.eventId);
  let near = others.filter((o) => km.get(o)! <= NEAR_KM);
  if (near.length < SIDE + 1)
    near = others.filter((o) => km.get(o)! <= FAR_KM);
  if (near.length < SIDE + 1)
    near = [...others]
      .sort((a, b) => km.get(a)! - km.get(b)!)
      .slice(0, NEAREST);
  const byStart = near.sort((a, b) => a.start - b.start || a.end - b.end);
  const lands: LandRow[] = [];
  for (const r of landRuns(input.path)) {
    const name = landName(r.n, locale);
    const last = lands.at(-1);
    if (last?.name === name) last.to = r.to;
    else lands.push({ name, from: r.from, to: r.to });
  }
  // 시작 연도를 다스린 나라: 시작 연도 이하에서 가장 늦게 나타난 나라(다음 나라가 나타나기 전이면)
  const landNow = lands.findLastIndex(
    (r, i) =>
      r.from <= input.start && (lands[i + 1]?.from ?? Infinity) > input.start,
  );
  return {
    before: byStart.filter((o) => o.start < input.start).slice(-SIDE),
    after: byStart.filter((o) => o.start >= input.start).slice(0, SIDE),
    lands,
    landNow,
    maps: markersIn(input.start, input.end)
      .filter((m) => m.path !== input.mapPath)
      .slice(0, 6),
  };
}
