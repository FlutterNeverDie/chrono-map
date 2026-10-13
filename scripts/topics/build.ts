// content/topics → src/data/generated/topics.json(지도 데이터) + topic-index.json(탭·목록용 작은 색인)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { root } from "../lib/content";
import { listTopics, readItems, readTopic, topicDir } from "./lib";

const topics = listTopics()
  .map((id) => {
    const topic = readTopic(id);
    const file = `${topicDir(id)}/wikipedia.json`;
    const wiki = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    const items = readItems(id).map((i) => ({ ...i, wiki: wiki[i.wikipedia]?.pages ?? {} }));
    const missing = items.filter((i) => !wiki[i.wikipedia]).length;
    console.log(`  ${id}: 항목 ${items.length}건${missing ? ` (요약 없음 ${missing} → npm run topics:fetch)` : ""}`);
    return { ...topic, items };
  })
  .sort((a, b) => a.order - b.order);

mkdirSync(root("src/data/generated"), { recursive: true });
writeFileSync(root("src/data/generated/topics.json"), JSON.stringify(topics));
writeFileSync(
  root("src/data/generated/topic-index.json"),
  JSON.stringify(
    topics.map((t) => ({
      id: t.id,
      order: t.order,
      mode: t.mode,
      color: t.color,
      title: t.title,
      description: t.description,
      // 본 지도 슬라이더의 "이 시기 다른 지도" 표시용 (항목 이름만, 가볍게)
      items: t.items.map((i) => ({
        id: i.id,
        start: i.start,
        end: i.end,
        importance: i.importance,
        titles: {
          ...Object.fromEntries(Object.entries(i.wiki).map(([l, p]) => [l, (p as { title: string }).title])),
          ...i.title,
        },
        wikipedia: i.wikipedia,
      })),
    })),
  ),
);
console.log(`주제 지도 ${topics.length}개 → src/data/generated/topics.json`);
