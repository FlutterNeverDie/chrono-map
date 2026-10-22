import { create } from "zustand";
import type { Scene, Terrain } from "./sceneData";

/**
 * 장면 상태(SceneLayer·SceneGl이 같이 읽는다). gl: WebGL 장면 판이 다 받았는지·지금 한 장 그리기(seek가 부른다 - 화면 층을 구워
 * 얹느라 비동기)
 */
export const useScene = create<{
  scene: Scene | null;
  t: number;
  frames: number;
  terrain: Terrain | null;
  /** 고정밀 국경(연도 → GeoJSON 주소, RMW가 scripts/scene-borders.mjs로 만들어 넘긴다) - 없으면 사이트 국경 */
  borders: Record<string, string> | null;
  gl: { ready: () => boolean; draw: () => Promise<void> } | null;
  /** 인물 얼굴 메달 그림(캐릭터/표정 → data URL, load가 다 만든 뒤 장면을 넣는다) */
  faces: Record<string, string>;
}>(() => ({ scene: null, t: 0, frames: 300, terrain: null, borders: null, gl: null, faces: {} }));
