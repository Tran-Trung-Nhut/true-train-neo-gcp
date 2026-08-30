import type { WritingAssessment } from "../ai/writing-types";
import { asRecord } from "./normalizers";
import type { StoreGet, StoreSet } from "./types";

export async function loadWritingQuota(set: StoreSet): Promise<void> {
  set({ writingQuotaLoading: true });
  try {
    const response = await fetch("/api/ai/writing", { credentials: "same-origin" });
    const data = asRecord(await response.json().catch(() => ({})));
    set({
      writingQuotaLoading: false,
      writingLimit: typeof data.limit === "number" ? data.limit : null,
      writingRemaining: typeof data.remaining === "number" ? data.remaining : null,
      writingAvailable: data.available !== false,
    });
  } catch {
    set({ writingQuotaLoading: false });
  }
}

export async function gradeWriting(set: StoreSet, get: StoreGet): Promise<void> {
  const state = get();
  if (state.writingGrading) return;
  if (!state.writingImage) {
    set({ writingError: "Upload a photo of the task prompt first." });
    return;
  }
  if (state.writingAnswer.trim().split(/\s+/).filter(Boolean).length < 20) {
    set({ writingError: "Your answer is too short to grade. Please write a fuller response." });
    return;
  }

  set({ writingGrading: true, writingError: "", writingResult: null });
  try {
    const response = await fetch("/api/ai/writing", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        taskType: state.writingTaskType,
        answer: state.writingAnswer,
        image: state.writingImage,
      }),
    });
    const data = asRecord(await response.json().catch(() => ({})));

    if (response.status === 429) {
      const limit = typeof data.limit === "number" ? data.limit : 3;
      set({
        writingGrading: false,
        writingError: `You have used all ${limit} Writing gradings for today. Come back tomorrow!`,
        writingLimit: limit,
        writingRemaining: 0,
      });
      return;
    }
    if (response.status === 503) {
      set({
        writingGrading: false,
        writingAvailable: false,
        writingError: "AI grading is not available on the server right now.",
      });
      return;
    }
    if (!response.ok || !data.assessment) {
      set({
        writingGrading: false,
        writingError: "Could not grade the answer. Check the task image and try again.",
      });
      return;
    }

    set({
      writingGrading: false,
      writingError: "",
      writingResult: data.assessment as WritingAssessment,
      writingLimit: typeof data.limit === "number" ? data.limit : get().writingLimit,
      writingRemaining:
        typeof data.remaining === "number" ? data.remaining : get().writingRemaining,
    });
  } catch {
    set({
      writingGrading: false,
      writingError: "Connection error while grading. Please try again.",
    });
  }
}
