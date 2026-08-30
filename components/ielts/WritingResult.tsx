"use client";

import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { WRITING_CRITERIA, bandColor } from "@/lib/ai/writing-types";
import { grotesk, mono, panel } from "../shared/ui";

const CRITERION_LABEL = new Map(WRITING_CRITERIA.map((c) => [c.key, c.short]));

export default function WritingResult() {
  const result = useStore((s) => s.writingResult);
  const reset = useStore((s) => s.resetWriting);
  if (!result) return null;

  return (
    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          ...panel,
          padding: 22,
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--panelHi)), var(--panel))",
        }}
      >
        <div
          style={{
            display: "grid",
            placeItems: "center",
            width: 96,
            height: 96,
            borderRadius: "50%",
            flex: "none",
            border: `3px solid ${bandColor(result.overall)}`,
            background: "var(--panel)",
          }}
        >
          <div style={{ ...grotesk(30), color: bandColor(result.overall), lineHeight: 1 }}>
            {result.overall.toFixed(1)}
          </div>
          <div style={{ ...mono(9.5, 600), color: "var(--faint)", marginTop: 2 }}>OVERALL</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ ...mono(11), color: "var(--accent)", textTransform: "uppercase" }}>
            estimated band
          </div>
          <div style={{ ...grotesk(19), marginTop: 4 }}>Grading result</div>
          {result.summary && (
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6, lineHeight: 1.55 }}>
              {result.summary}
            </p>
          )}
        </div>
      </div>

      {result.offTopic && (
        <div style={{ ...panel, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", borderColor: "color-mix(in srgb, var(--bad) 45%, var(--border))", color: "var(--bad)", ...mono(12.5, 600) }}>
          <AlertTriangle size={16} />
          The answer does not address the task in the image, so the bands are capped. Make sure you answer what the task asks.
        </div>
      )}

      <div className="writing-criteria">
        {result.criteria.map((criterion) => (
          <div key={criterion.key} style={{ ...panel, padding: 15 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ ...grotesk(14.5) }}>{criterion.name}</div>
                <div style={{ ...mono(10.5), color: "var(--faint)", marginTop: 2 }}>
                  {CRITERION_LABEL.get(criterion.key)}
                </div>
              </div>
              <div style={{ ...grotesk(20), color: bandColor(criterion.band), flex: "none" }}>
                {criterion.band.toFixed(1)}
              </div>
            </div>
            <div
              style={{
                height: 5,
                borderRadius: 3,
                marginTop: 10,
                background: "var(--track)",
                overflow: "hidden",
              }}
            >
              <div style={{ width: `${(criterion.band / 9) * 100}%`, height: "100%", background: bandColor(criterion.band) }} />
            </div>
            {criterion.feedback && (
              <p style={{ color: "var(--muted)", fontSize: 12.8, marginTop: 10, lineHeight: 1.55 }}>
                {criterion.feedback}
              </p>
            )}
          </div>
        ))}
      </div>

      {result.corrections.length > 0 && (
        <div style={{ ...panel, padding: 18 }}>
          <div style={{ ...grotesk(16), marginBottom: 12 }}>Corrections & suggestions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.corrections.map((correction, index) => (
              <div key={index} style={{ borderLeft: "2px solid var(--border)", paddingLeft: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13.2 }}>
                  {correction.original && (
                    <span style={{ color: "var(--bad)", textDecoration: "line-through", opacity: 0.85 }}>
                      {correction.original}
                    </span>
                  )}
                  {correction.original && correction.suggestion && (
                    <ArrowRight size={13} style={{ color: "var(--faint)", flex: "none" }} />
                  )}
                  {correction.suggestion && (
                    <span style={{ color: "var(--ok)", fontWeight: 600 }}>{correction.suggestion}</span>
                  )}
                </div>
                {correction.note && (
                  <div style={{ ...mono(11.5), color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
                    {correction.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.improvedVersion && (
        <div style={{ ...panel, padding: 18 }}>
          <div style={{ ...grotesk(16), marginBottom: 6 }}>Model rewrite (high band)</div>
          <div style={{ ...mono(11), color: "var(--faint)", marginBottom: 12 }}>
            Keeps your ideas, expressed more naturally.
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--text)" }}>
            {result.improvedVersion}
          </p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={reset} className="ghost-btn" style={{ ...mono(12.5, 600), display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--muted)", cursor: "pointer" }}>
          <RotateCcw size={14} /> grade another
        </button>
      </div>
    </div>
  );
}
