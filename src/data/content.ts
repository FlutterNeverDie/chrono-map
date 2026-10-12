import type { Content } from "@/lib/types";
import generated from "./generated/content.json";

/**
 * 사건·시점별 순서 데이터의 유일한 진입점.
 * 원본은 content/*.txt, `npm run content`가 generated/content.json을 만든다.
 * **서버(페이지)에서만 import한다.** 화면에는 `localizeEvent`로 그 언어 부분만 골라 `EventsProvider`로 넘긴다.
 */
const content = generated as unknown as Content;

export const EVENTS = content.events;
export const RANKINGS = content.rankings;
export { LAST_YEAR } from "./contentMeta";
