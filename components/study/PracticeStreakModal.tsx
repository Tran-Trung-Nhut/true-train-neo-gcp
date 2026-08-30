"use client";

import { Flame, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { getStreakVisual, previousStreakMilestone } from "@/lib/streak-ui";
import { grotesk, mono, panel, solidBtn } from "../shared/ui";

function progressToNext(streak: number, nextMilestone: number | null) {
  if (!nextMilestone) return 100;
  const previous = previousStreakMilestone(streak);
  return Math.min(100, Math.max(0, ((streak - previous) / (nextMilestone - previous)) * 100));
}

export default function PracticeStreakModal() {
  const popup = useStore((s) => s.practiceStreakPopup);
  const dismiss = useStore((s) => s.dismissPracticeStreakPopup);

  if (!popup) return null;

  const visual = getStreakVisual(popup.streak, true);
  const iconSize = Math.round(82 * visual.scale);
  const nextText = visual.nextMilestone
    ? `${Math.max(visual.nextMilestone - popup.streak, 0)} more days to reach the ${visual.nextMilestone}-day milestone.`
    : "You have reached the highest milestone available.";
  const progress = progressToNext(popup.streak, visual.nextMilestone);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Streak celebration"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "rgba(0,0,0,.68)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          ...panel,
          position: "relative",
          width: "min(520px, 100%)",
          padding: "34px 30px 30px",
          textAlign: "center",
          overflow: "hidden",
          borderColor: visual.border,
          boxShadow: `0 28px 80px ${visual.glow}, var(--shadowMd)`,
          background: `radial-gradient(circle at 50% -18%, ${visual.glow}, transparent 42%), linear-gradient(180deg, ${visual.bg}, var(--panel) 60%)`,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 14,
            border: `1px solid ${visual.border}`,
            borderRadius: 12,
            pointerEvents: "none",
            opacity: 0.65,
          }}
        />

        <div style={{ position: "relative", display: "grid", justifyItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${visual.border}`,
              borderRadius: 999,
              padding: "7px 11px",
              background: `linear-gradient(180deg, color-mix(in srgb, #fff 36%, ${visual.bg}), ${visual.bg})`,
              color: visual.fg,
              boxShadow: `0 10px 28px -18px ${visual.glow}, 0 1px 0 rgba(255,255,255,.7) inset`,
              textShadow: "0 1px 0 rgba(255,255,255,.55)",
              ...mono(12, 700),
              textTransform: "uppercase",
            }}
          >
            <Sparkles size={14} /> {visual.title}
          </span>

          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: iconSize,
              height: iconSize,
              borderRadius: 24,
              marginTop: 22,
              background: `radial-gradient(circle at 34% 24%, rgba(255,255,255,.72), transparent 34%), ${visual.bg}`,
              color: visual.fg,
              border: `1px solid ${visual.border}`,
              boxShadow: `0 18px 50px ${visual.glow}, 0 1px 0 rgba(255,255,255,.72) inset`,
            }}
          >
            <Flame size={Math.round(42 * visual.scale)} fill="currentColor" strokeWidth={1.8} />
          </span>

          <h2 style={{ ...grotesk(46 * visual.scale), margin: "20px 0 0", color: visual.fg, lineHeight: 1 }}>
            {popup.streak}-day streak
          </h2>
          <div style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.55, marginTop: 12, maxWidth: 390 }}>
            You finished your first practice session today. Your streak just grew by another day.
          </div>

          <div style={{ width: "100%", maxWidth: 360, marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)", ...mono(12) }}>
              <span>{visual.label}</span>
              <span>{nextText}</span>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                marginTop: 9,
                background: "color-mix(in srgb, var(--border) 68%, transparent)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: visual.fg,
                  boxShadow: `0 0 22px ${visual.glow}`,
                }}
              />
            </div>
          </div>

          <button onClick={dismiss} className="solid-btn" style={{ ...solidBtn, marginTop: 26, padding: "12px 22px" }}>
            continue
          </button>
        </div>
      </div>
    </div>
  );
}
