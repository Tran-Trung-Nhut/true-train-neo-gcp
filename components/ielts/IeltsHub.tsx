"use client";

import { Headphones, BookOpenText, PenLine, Mic, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { grotesk, mono, panel } from "../shared/ui";

type Skill = {
  key: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  ready: boolean;
};

const SKILLS: Skill[] = [
  {
    key: "writing",
    name: "Writing",
    desc: "Upload the task image, write your answer, and let AI grade it against the IELTS criteria with detailed feedback.",
    icon: <PenLine size={20} />,
    ready: true,
  },
  {
    key: "speaking",
    name: "Speaking",
    desc: "Practise each speaking part and get AI feedback.",
    icon: <Mic size={20} />,
    ready: false,
  },
  {
    key: "reading",
    name: "Reading",
    desc: "Practise reading comprehension with true-to-format tasks.",
    icon: <BookOpenText size={20} />,
    ready: false,
  },
  {
    key: "listening",
    name: "Listening",
    desc: "Practise listening with the most common question types.",
    icon: <Headphones size={20} />,
    ready: false,
  },
];

export default function IeltsHub() {
  const nav = useStore((s) => s.nav);

  return (
    <div className="app-container" style={{ padding: "34px 24px 60px" }}>
      <div style={{ ...mono(11.5), color: "var(--accent)", textTransform: "uppercase" }}>
        IELTS practice
      </div>
      <h1 style={{ ...grotesk(28), margin: "8px 0 6px" }}>Choose a skill to practise</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, maxWidth: 620, lineHeight: 1.5 }}>
        Start with Writing - the other skills are coming soon.
      </p>

      <div className="ielts-grid" style={{ marginTop: 26 }}>
        {SKILLS.map((skill) => (
          <button
            key={skill.key}
            type="button"
            disabled={!skill.ready}
            onClick={() => skill.ready && nav("writing")}
            style={{
              ...panel,
              textAlign: "left",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 150,
              cursor: skill.ready ? "pointer" : "default",
              opacity: skill.ready ? 1 : 0.6,
              border: skill.ready
                ? "1px solid color-mix(in srgb, var(--accent) 34%, var(--border))"
                : "1px solid var(--border)",
              background: skill.ready
                ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--panelHi)), var(--panel))"
                : "var(--panel)",
              transition: "transform .15s, border-color .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: skill.ready ? "color-mix(in srgb, var(--accent) 16%, var(--panel))" : "var(--panelHi)",
                  color: skill.ready ? "var(--accent)" : "var(--muted)",
                }}
              >
                {skill.icon}
              </span>
              {skill.ready ? (
                <ArrowRight size={18} style={{ color: "var(--accent)" }} />
              ) : (
                <span style={{ ...mono(10.5, 600), color: "var(--faint)", textTransform: "uppercase" }}>
                  coming soon
                </span>
              )}
            </div>
            <div>
              <div style={{ ...grotesk(19) }}>{skill.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>
                {skill.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
