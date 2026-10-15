import type { Locale } from "@/lib/types";
import generated from "./generated/lands.json";

/**
 * 사건 자리를 다스린 나라의 차례(사건 상세 "이 땅을 다스린 나라"). **서버에서만** import.
 * `npm run lands`(scripts/build-lands.ts)가 국경 스냅샷(public/borders)에서 사건 좌표가 속한 나라를 찾아 만든다.
 */
export type LandRun = {
  /** 국경 원본 이름(public/borders의 n) */
  n: string;
  /** 그 나라가 처음 보인 스냅샷 연도 */
  from: number;
  /** 다음 나라가 나타나기 전 마지막 스냅샷 연도. 마지막 스냅샷까지 이어지면 null */
  to: number | null;
};

const lands = generated as unknown as {
  runs: Record<string, LandRun[]>;
  names: Record<Locale, Record<string, string>>;
};

export const landRuns = (eventId: string): LandRun[] => lands.runs[eventId] ?? [];
export const landName = (n: string, locale: Locale) => lands.names[locale][n] ?? n;
