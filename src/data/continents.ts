import type { ContinentId } from "@/lib/types";

/** 대륙 표시 순서·이름·색상의 단일 출처 */
export const CONTINENTS: { id: ContinentId; name: string; color: string }[] = [
  { id: "asia", name: "아시아", color: "#e11d48" },
  { id: "europe", name: "유럽", color: "#2563eb" },
  { id: "africa", name: "아프리카", color: "#d97706" },
  { id: "north-america", name: "북아메리카", color: "#16a34a" },
  { id: "south-america", name: "남아메리카", color: "#9333ea" },
  { id: "oceania", name: "오세아니아", color: "#0891b2" },
];
