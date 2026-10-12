import raw from "@/data/generated/topics.json";
import type { Topic } from "./types";

/** 서버(페이지)에서만 import한다. 클라이언트에는 그 페이지의 주제 지도 하나만 props로 넘긴다 */
export const TOPICS = raw as unknown as Topic[];
export const findTopic = (id: string) => TOPICS.find((t) => t.id === id);
