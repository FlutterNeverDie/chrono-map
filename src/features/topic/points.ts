"use client";

import { useEffect, useMemo, useState } from "react";
import { loadJson } from "@/components/map";
import type { Locale } from "@/lib/types";
import type { Topic, TopicPoint } from "./types";

type File = {
  items: string[];
  points: [number, string, number, number, number, number, string, string][];
};

/** 항목 안의 작은 점(Topic.points) - 지도가 열린 뒤 따로 받는다(없으면 빈 목록) */
export function useTopicPoints(topic: Topic, locale: Locale): TopicPoint[] {
  const url = topic.points?.url.replace("{locale}", locale);
  const [file, setFile] = useState<{ url: string; data: File } | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    loadJson<File>(url)
      .then((data) => alive && setFile({ url, data }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
  return useMemo(() => {
    if (!file || file.url !== url) return [];
    const { items, points } = file.data;
    return points.map(([i, id, start, end, lon, lat, title, when]) => ({
      id,
      item: items[i],
      start,
      end,
      coords: [lon, lat],
      title,
      when,
    }));
  }, [file, url]);
}

/** 지금(t) 보이는 점: 기간 안이고 그 항목도 보일 때 */
export const visiblePoints = (
  points: TopicPoint[],
  t: number,
  items: { id: string }[],
) => {
  const shown = new Set(items.map((i) => i.id));
  return points.filter((p) => p.start <= t && t <= p.end && shown.has(p.item));
};

/** 점을 골랐을 때 가는 경로(언어 접두어 없이) */
export const pointLink = (topic: Topic, p: TopicPoint) =>
  topic.points?.link.replace("{item}", p.item).replace("{id}", p.id);
