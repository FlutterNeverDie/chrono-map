import { create } from "zustand";

type TimelineState = {
  year: number;
  setYear: (year: number) => void;
};

export const useTimeline = create<TimelineState>((set) => ({
  year: 1492,
  setYear: (year) => set({ year }),
}));
