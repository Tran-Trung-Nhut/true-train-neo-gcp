"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { AI_LIMITS } from "@/lib/ai/config";
import { AI_QUIZ_CONFIG, AI_QUIZ_TYPES } from "@/lib/quiz-config";
import { isCardDue } from "@/lib/study";
import { useStore } from "@/lib/store";
import { ghostBtn, grotesk, mono, panel, solidBtn } from "../shared/ui";

export default function AiQuizControls() {
  const [modalOpen, setModalOpen] = useState(false);
  const quizSource = useStore((state) => state.quizSource);
  const loading = useStore((state) => state.aiQuizLoading);
  const error = useStore((state) => state.aiQuizError);
  const quotaLoading = useStore((state) => state.aiQuizQuotaLoading);
  const limit = useStore((state) => state.aiQuizLimit);
  const remaining = useStore((state) => state.aiQuizRemaining);
  const simulated = useStore((state) => state.aiQuizSimulated);
  const questionCount = useStore((state) => state.aiQuizQuestionCount);
  const selectedTypes = useStore((state) => state.aiQuizTypes);
  const dueCardCount = useStore(
    (state) => state.studyCards.filter((card) => isCardDue(card)).length
  );
  const generate = useStore((state) => state.generateAiQuiz);
  const loadQuota = useStore((state) => state.loadAiQuizQuota);
  const setQuestionCount = useStore((state) => state.setAiQuizQuestionCount);
  const toggleType = useStore((state) => state.toggleAiQuizType);

  const maxQuestions = Math.min(AI_QUIZ_CONFIG.maxQuestionCount, dueCardCount);
  const effectiveCount = Math.min(questionCount, maxQuestions);
  const questionChoices = [
    ...new Set([...AI_QUIZ_CONFIG.questionChoices, maxQuestions]),
  ]
    .filter((count) => count > 0 && count <= maxQuestions)
    .sort((a, b) => a - b);
  const isAiQuiz = quizSource === "ai";

  useEffect(() => {
    if (!modalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) setModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [modalOpen, loading]);

  function openModal() {
    if (effectiveCount > 0) setQuestionCount(effectiveCount);
    setModalOpen(true);
    void loadQuota();
  }

  async function createQuiz() {
    await generate();
    if (!useStore.getState().aiQuizError) setModalOpen(false);
  }

  return (
    <>
      <div
        style={{
          ...panel,
          padding: 18,
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--panelHi)), var(--panel))",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...mono(11), color: "var(--accent)", textTransform: "uppercase" }}>
              {isAiQuiz ? "AI quiz is on" : "upgrade this quiz"}
            </span>
            {isAiQuiz && simulated && (
              <span style={{ ...mono(10.5), color: "var(--warning)" }}>simulated</span>
            )}
          </div>
          <div style={grotesk(17)}>Generate an AI quiz in exactly the formats you want</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, lineHeight: 1.45 }}>
            AI writes fresh situations and phrasing, so you have to reason instead of recognising a definition you already saw.
          </div>
        </div>
        <button onClick={openModal} className="solid-btn" style={{ ...solidBtn, padding: "10px 14px" }}>
          <Sparkles size={14} /> {isAiQuiz ? "regenerate with AI" : "generate with AI"}
        </button>
      </div>

      {error && !modalOpen && (
        <div
          style={{
            ...panel,
            marginBottom: 18,
            padding: "11px 13px",
            borderColor: "color-mix(in srgb, var(--bad) 45%, var(--border))",
            color: "var(--bad)",
            ...mono(12.5, 600),
          }}
        >
          {error}
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generate quiz with AI"
          onClick={() => !loading && setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(0,0,0,.58)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ ...panel, width: "min(560px, 100%)", padding: 20, boxShadow: "var(--shadowMd)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ ...mono(11), color: "var(--accent)", textTransform: "uppercase" }}>
                  Advanced AI quiz
                </div>
                <h3 style={{ ...grotesk(22), margin: "7px 0 0" }}>Configure the question set</h3>
                <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
                  Each generation uses one AI credit. Questions use new contexts and near-synonym distractors to raise the difficulty.
                </div>
              </div>
              <button
                aria-label="close"
                onClick={() => setModalOpen(false)}
                disabled={loading}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  color: "var(--muted)",
                  cursor: loading ? "default" : "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: "11px 13px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panelHi)",
                color: "var(--muted)",
                ...mono(12.5, 600),
              }}
            >
              {quotaLoading
                ? "Checking your AI credits for today..."
                : typeof remaining === "number" && typeof limit === "number"
                  ? `${remaining}/${limit} AI quiz generations left today.`
                  : `You get ${AI_LIMITS.quiz} AI quiz generations per day.`}
            </div>

            <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
              <OptionGroup label="questions">
                {questionChoices.map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    disabled={loading}
                    style={chipStyle(questionCount === count, loading)}
                  >
                    {count}
                  </button>
                ))}
              </OptionGroup>

              <OptionGroup label="question types">
                {AI_QUIZ_TYPES.map((type) => {
                  const selected = selectedTypes.includes(type);
                  const disabled = loading || (selected && selectedTypes.length === 1);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      disabled={disabled}
                      style={chipStyle(selected, disabled)}
                      title={selected && selectedTypes.length === 1 ? "Keep at least one type" : undefined}
                    >
                      {type}
                    </button>
                  );
                })}
              </OptionGroup>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid color-mix(in srgb, var(--bad) 45%, var(--border))",
                  color: "var(--bad)",
                  background: "color-mix(in srgb, var(--bad) 8%, var(--panel))",
                  ...mono(12.5, 600),
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              <button
                onClick={() => setModalOpen(false)}
                disabled={loading}
                className="ghost-btn"
                style={{ ...ghostBtn, opacity: loading ? 0.6 : 1 }}
              >
                cancel
              </button>
              <button
                onClick={() => void createQuiz()}
                disabled={loading || remaining === 0}
                className="solid-btn"
                style={{
                  ...solidBtn,
                  opacity: loading || remaining === 0 ? 0.64 : 1,
                  cursor: loading || remaining === 0 ? "default" : "pointer",
                }}
              >
                {loading ? <span className="spinner" /> : <Sparkles size={14} />}
                generate {effectiveCount}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...mono(11.5), color: "var(--faint)", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function chipStyle(selected: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 8,
    border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: selected
      ? "color-mix(in srgb, var(--accent) 13%, var(--panel))"
      : "var(--panel)",
    color: selected ? "var(--accent)" : "var(--muted)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled && !selected ? 0.55 : 1,
    ...mono(11.5, 600),
  };
}
