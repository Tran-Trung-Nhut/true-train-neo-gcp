"use client";

import { Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { ghostBtn, grotesk, mono, panel, solidBtn } from "../shared/ui";
import PracticeStreakModal from "./PracticeStreakModal";

export default function QuizResults() {
  const questions = useStore((state) => state.quizQuestions);
  const correctCount = useStore((state) => state.qCorrect);
  const wrongQuestions = useStore((state) => state.qWrong);
  const restart = useStore((state) => state.quizRestart);
  const nav = useStore((state) => state.nav);

  return (
    <>
      <div style={{ display: "grid", placeItems: "center", padding: "30px 0" }}>
        <div
          style={{
            ...panel,
            padding: "38px 34px",
            textAlign: "center",
            maxWidth: 460,
            width: "100%",
          }}
        >
          <span style={{ color: "var(--accent)", display: "inline-flex" }}>
            <Target size={44} strokeWidth={1.5} />
          </span>
          <div style={{ ...grotesk(46), color: "var(--accent)", marginTop: 14 }}>
            {correctCount} / {questions.length}
          </div>
          <div style={{ ...mono(12.5), color: "var(--muted)", marginTop: 4 }}>correct answers</div>

          {wrongQuestions.length > 0 && (
            <div style={{ ...panel, marginTop: 22, padding: 16, textAlign: "left" }}>
              <div
                style={{
                  ...mono(11),
                  color: "var(--faint)",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                needs another review
              </div>
              {wrongQuestions.map((question) => (
                <div
                  key={question.cardId}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}
                >
                  <span style={grotesk(14)}>{question.options.find((option) => option.c)?.t}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{question.def}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
            <button onClick={restart} className="solid-btn" style={solidBtn}>
              check due cards
            </button>
            <button onClick={() => nav("dashboard")} className="ghost-btn" style={ghostBtn}>
              back to dashboard
            </button>
          </div>
        </div>
      </div>
      <PracticeStreakModal />
    </>
  );
}
