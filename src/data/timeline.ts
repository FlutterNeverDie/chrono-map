import { createTimeScale } from "@/lib/timeScale";
import { LAST_YEAR } from "./content";

/** 문명 시작: 국경 데이터(Cliopatria)의 첫 국가인 수메르 도시국가(기원전 3400년)를 포함하는 기원전 35세기 */
export const MIN_YEAR = -3500;
/** 끝: 등록된 사건 중 가장 늦은 연도. 그 뒤로는 슬라이더가 가지 않는다 */
export const MAX_YEAR = LAST_YEAR;

export const TIME_SCALE = createTimeScale(MIN_YEAR, MAX_YEAR);
