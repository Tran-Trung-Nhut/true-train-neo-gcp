"use client";

import { Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { grotesk, mono, panel, solidBtn } from "../shared/ui";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function QuizQuestion() {
  const questions = useStore((state) => state.quizQuestions);
  const index = useStore((state) => state.qIndex);
  const selectedIndex = useStore((state) => state.qSelected);
  const answered = useStore((state) => state.qAnswered);
  const reviewPending = useStore((state) => state.qReviewPending);
  const pick = useStore((state) => state.quizPick);
  const next = useStore((state) => state.quizNext);
  const question = questions[index];
  const correctIndex = question.options.findIndex((option) => option.c);
  const answeredCorrectly =
    answered && selectedIndex !== null && question.options[selectedIndex]?.c === true;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 5, flex: 1 }}>
          {questions.map((item, questionIndex) => (
            <div
              key={item.cardId}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 3,
                background:
                  questionIndex < index
                    ? "var(--accent)"
                    : questionIndex === index
                      ? "color-mix(in srgb, var(--accent) 50%, var(--track))"
                      : "var(--track)",
              }}
            />
          ))}
        </div>
        <span style={{ ...mono(12.5), color: "var(--muted)" }}>
          {index + 1} / {questions.length}
        </span>
      </div>

      <div
        style={{
          ...mono(11),
          color: "var(--accent)",
          textTransform: "uppercase",
          marginTop: 26,
        }}
      >
        {question.label}
      </div>
      <h2 style={{ ...grotesk(22), marginTop: 10 }}>{question.q}</h2>

      <div
        className="quiz-options"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 22 }}
      >
        {question.options.map((option, optionIndex) => {
          const state = answered
            ? option.c
              ? "correct"
              : optionIndex === selectedIndex
                ? "wrong"
                : "default"
            : "default";
          return (
            <button
              key={option.t}
              onClick={() => void pick(optionIndex)}
              disabled={reviewPending || answered}
              style={optionStyle(state, reviewPending || answered, reviewPending)}
            >
              <span style={optionBadgeStyle(state)}>{OPTION_KEYS[optionIndex]}</span>
              <span style={{ flex: 1 }}>{option.t}</span>
              {state === "correct" && <Check size={15} color="var(--ok)" />}
              {state === "wrong" && <X size={15} color="var(--bad)" />}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div
          style={{
            ...panel,
            marginTop: 18,
            padding: 18,
            borderColor: answeredCorrectly ? "var(--ok)" : "var(--bad)",
          }}
        >
          <div
            style={{
              ...mono(13, 600),
              color: answeredCorrectly ? "var(--ok)" : "var(--bad)",
            }}
          >
            {answeredCorrectly
              ? "✓ correct"
              : `✕ correct answer: ${OPTION_KEYS[correctIndex]}`}
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>{question.def}</div>
          <div style={{ fontSize: 13.5, fontStyle: "italic", color: "var(--faint)", marginTop: 4 }}>
            {question.ex}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={next} className="solid-btn" style={solidBtn}>
              {index === questions.length - 1 ? "see results →" : "next question →"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 20, ...mono(11.5), color: "var(--faint)" }}>
          {reviewPending ? "saving your answer..." : "[ A-D ] or [ 1-4 ] to answer / [ enter ] next"}
        </div>
      )}
    </>
  );
}

type OptionState = "default" | "correct" | "wrong";

function optionStyle(
  state: OptionState,
  disabled: boolean,
  pending: boolean
): React.CSSProperties {
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 13,
    width: "100%",
    textAlign: "left",
    padding: "16px 18px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    cursor: disabled ? "default" : "pointer",
    opacity: pending ? 0.65 : 1,
    fontSize: 15,
    color: "var(--text)",
    transition: "all .14s",
  };
  if (state === "correct") {
    return {
      ...style,
      borderColor: "var(--ok)",
      background: "color-mix(in srgb, var(--ok) 12%, var(--panel))",
    };
  }
  if (state === "wrong") {
    return {
      ...style,
      borderColor: "var(--bad)",
      background: "color-mix(in srgb, var(--bad) 10%, var(--panel))",
      animation: "shakeX .4s ease",
    };
  }
  return style;
}

function optionBadgeStyle(state: OptionState): React.CSSProperties {
  const color = state === "correct" ? "var(--ok)" : state === "wrong" ? "var(--bad)" : "var(--track)";
  return {
    flex: "none",
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: color,
    color: state === "default" ? "var(--muted)" : "#fff",
    ...mono(13, 600),
  };
}
