import { markPracticeCompleted, type PracticeMode } from "../queries";
import type { StoreGet, StoreSet } from "./types";

export async function completePracticeStreak(
  mode: PracticeMode,
  reviewed: number,
  correct: number | undefined,
  set: StoreSet,
  get: StoreGet
): Promise<void> {
  try {
    const result = await markPracticeCompleted({ mode, reviewed, correct });
    if (result.increased) {
      set({ practiceStreakPopup: { streak: result.streak } });
    }
  } catch {
    return;
  } finally {
    void get().loadStats();
    void get().loadDecks();
  }
}
