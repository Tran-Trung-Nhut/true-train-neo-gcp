"use client";

import { useEffect } from "react";
import { BarChart3, BookOpenCheck, CheckCircle2, Clock3 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Comment, grotesk, mono, panel } from "../shared/ui";
import Heatmap from "../shared/Heatmap";

export default function Stats() {
  const stats = useStore((s) => s.stats);
  const dailyCounts = useStore((s) => s.dailyCounts);
  const loadStats = useStore((s) => s.loadStats);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const counts = dailyCounts.length ? dailyCounts : new Array(30).fill(0);
  const bars = counts.slice(-30); // the bar chart only shows the most recent 30 days
  const cMax = Math.max(1, ...bars);
  const totalReviews = bars.reduce((a, b) => a + b, 0);

  const BIG = [
    { label: "total words", value: String(stats?.totalWords ?? 0), fg: "var(--text)", icon: BookOpenCheck },
    { label: "learned", value: String(stats?.learned ?? 0), fg: "var(--ok)", icon: CheckCircle2 },
    { label: "due", value: String(stats?.due ?? 0), fg: "var(--accent)", icon: Clock3 },
    { label: "accuracy", value: `${stats?.accuracy ?? 0}%`, fg: "var(--warning)", icon: BarChart3 },
  ];

  return (
    <div className="app-container" style={{ padding: "34px 24px 80px" }}>
      <Comment>{"// stats"}</Comment>
      <h1 style={{ ...grotesk(32), marginTop: 14 }}>Stats</h1>

      <div
        className="stat-strip"
        style={{ ...panel, marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", overflow: "hidden" }}
      >
        {BIG.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="stat-col"
              style={{ padding: "20px 22px", borderLeft: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ ...mono(11), color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0 }}>
                  {s.label}
                </div>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--panelHi)",
                    color: s.fg,
                  }}
                >
                  <Icon size={15} />
                </span>
              </div>
              <div style={{ ...grotesk(40), color: s.fg, marginTop: 12 }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ ...panel, marginTop: 18, padding: 24 }}>
        <div style={{ ...mono(11.5), color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0 }}>
          reviews / 30 days ({totalReviews})
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, marginTop: 18 }}>
          {bars.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.round((v / cMax) * 100)}%`,
                background: "var(--accent)",
                opacity: 0.85,
                borderRadius: "3px 3px 0 0",
                minWidth: 4,
                minHeight: v > 0 ? 3 : 0,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ ...panel, marginTop: 18, padding: 24 }}>
        <div style={{ ...mono(11.5), color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0, marginBottom: 18 }}>
          activity streak
        </div>
        <Heatmap counts={counts} cell={14} />
      </div>

      <div style={{ ...panel, marginTop: 18, padding: 24 }}>
        <div style={{ ...mono(11.5), color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0, marginBottom: 8 }}>
          breakdown by deck
        </div>
        {(stats?.perDeck ?? []).map((d, i) => {
          const pct = d.total ? Math.round((d.learned / d.total) * 100) : 0;
          return (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span style={{ ...mono(12.5), color: "var(--faint)", width: 22 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ ...grotesk(15), flex: "0 0 160px" }}>{d.name}</span>
              <div style={{ flex: 1, height: 3, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
              </div>
              <span style={{ ...mono(12), color: "var(--muted)", width: 64, textAlign: "right" }}>
                {d.learned}/{d.total}
              </span>
            </div>
          );
        })}
        {(!stats || stats.perDeck.length === 0) && (
          <div style={{ ...mono(12.5), color: "var(--faint)", padding: "14px 0" }}>no data yet</div>
        )}
      </div>
    </div>
  );
}
