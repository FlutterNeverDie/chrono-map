import { create } from "zustand";
import type { CategoryId } from "@/lib/types";

type FiltersState = {
  /** 고른 카테고리(한 번에 하나만). 비어 있으면 전체 */
  categories: CategoryId[];
  /** 그 카테고리 하나만 고른다. 이미 고른 것을 다시 누르면 전체로 */
  selectCategory: (id: CategoryId) => void;
  clearCategories: () => void;
};

export const useFilters = create<FiltersState>((set) => ({
  categories: [],
  // 여러 개를 겹쳐 고르면 불편해서 하나만(배열은 lib/events의 filterByCategory와 맞추려고 유지)
  selectCategory: (id) =>
    set((s) => ({ categories: s.categories.includes(id) ? [] : [id] })),
  clearCategories: () => set({ categories: [] }),
}));
