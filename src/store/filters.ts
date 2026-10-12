import { create } from "zustand";
import type { CategoryId } from "@/lib/types";

type FiltersState = {
  /** 고른 카테고리. 비어 있으면 전체 */
  categories: CategoryId[];
  toggleCategory: (id: CategoryId) => void;
  clearCategories: () => void;
};

export const useFilters = create<FiltersState>((set) => ({
  categories: [],
  toggleCategory: (id) =>
    set((s) => ({
      categories: s.categories.includes(id)
        ? s.categories.filter((c) => c !== id)
        : [...s.categories, id],
    })),
  clearCategories: () => set({ categories: [] }),
}));
