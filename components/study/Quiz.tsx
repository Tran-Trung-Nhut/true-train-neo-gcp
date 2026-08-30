"use client";

import { useStore } from "@/lib/store";
import { ghostBtn, panel } from "../shared/ui";
import AiQuizControls from "./AiQuizControls";
import QuizQuestion from "./QuizQuestion";
import QuizResults from "./QuizResults";

export default function Quiz() {
  const questions = useStore((state) => state.quizQuestions);
  const loading = useStore((state) => state.studyLoading);
  const done = useStore((state) => state.qDone);
  const activeDeckId = useStore((state) => state.activeDeckId);
  const deckTotal = useStore(
    (state) => state.decks.find((deck) => deck.id === activeDeckId)?.total ?? 0
  );
  const openStudyPicker = useStore((state) => state.openStudyPicker);

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: "50px 0" }}>
        <div style={{ ...panel, padding: "36px 30px", textAlign: "center", maxWidth: 400 }}>
          <p style={{ color: "var(--muted)", fontSize: 14.5 }}>
            {deckTotal > 0
              ? "No new or due words left in this deck to build a quiz today."
              : "This deck does not have enough words to build a quiz."}
          </p>
          <button
            onClick={() => openStudyPicker("quiz")}
            className="ghost-btn"
            style={{ ...ghostBtn, marginTop: 16 }}
          >
            choose another deck
          </button>
        </div>
      </div>
    );
  }

  if (done) return <QuizResults />;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <AiQuizControls />
      <QuizQuestion />
    </div>
  );
}
