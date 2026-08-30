"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { STUDY_ORDERS, type StudyOrder } from "@/lib/study-config";
import { signOutEverywhere } from "@/lib/auth/client-actions";
import { ORIGIN_LANGUAGES, type OriginLanguage } from "@/lib/origin-language";
import { Comment, chipStyle, grotesk, iconBtn, mono, panel, solidBtn, Toggle } from "../shared/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 30 }}>
      <Comment>{title}</Comment>
      <div style={{ ...panel, marginTop: 12, padding: 6 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 16px",
      }}
    >
      <span style={{ fontSize: 14.5 }}>{label}</span>
      {children}
    </div>
  );
}

const ORDER_OPTIONS = Object.entries(STUDY_ORDERS) as [StudyOrder, string][];

export default function Settings() {
  const s = useStore();
  const email = useStore((st) => st.email);
  const displayName = useStore((st) => st.displayName);
  const name = displayName || (email ? email.split("@")[0] : "there");
  const [nameDraft, setNameDraft] = useState(name);
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutEverywhere();
      window.location.href = "/login";
    } catch {
      setSigningOut(false);
    }
  }

  useEffect(() => {
    setNameDraft(name);
  }, [name]);

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    const nextName = nameDraft.trim().replace(/\s+/g, " ");
    if (!nextName || nextName === displayName) return;
    setSavingName(true);
    try {
      await s.updateDisplayName(nextName);
    } finally {
      setSavingName(false);
    }
  }

  const segGroup = <T extends string,>(
    options: [T, string][],
    value: T,
    onPick: (key: T) => void
  ) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onPick(k)} style={chipStyle(value === k)}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "34px 24px 80px" }}>
      <Comment>{"// settings"}</Comment>
      <h1 style={{ ...grotesk(32), marginTop: 14 }}>Settings</h1>

      <div style={{ ...panel, marginTop: 26, padding: 20, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 46,
              height: 46,
              borderRadius: 8,
              border: "1px solid var(--borderHi)",
              background: "var(--panelHi)",
              ...grotesk(20),
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...grotesk(17), textTransform: "capitalize" }}>{name}</div>
            <div style={{ ...mono(12), color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
              {email || "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="ghost-btn"
            style={{
              flex: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 13px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--muted)",
              ...mono(12.5, 500),
              cursor: signingOut ? "default" : "pointer",
              opacity: signingOut ? 0.6 : 1,
            }}
          >
            {signingOut ? "signing out..." : "sign out"}
          </button>
        </div>

        <form onSubmit={submitName} style={{ display: "flex", gap: 8 }}>
          <input
            aria-label="Display name"
            value={nameDraft}
            maxLength={40}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Display name"
            style={{
              minWidth: 0,
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 12px",
              background: "var(--panelHi)",
              color: "var(--text)",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            className="solid-btn"
            disabled={savingName || !nameDraft.trim() || nameDraft.trim().replace(/\s+/g, " ") === displayName}
            style={{
              ...solidBtn,
              opacity: savingName || !nameDraft.trim() ? 0.6 : 1,
              flex: "none",
            }}
          >
            <Save size={14} /> {savingName ? "saving" : "save"}
          </button>
        </form>
      </div>

      <Section title="// study">
        <Row label="Max cards or questions per session">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={s.decSessionSize} style={iconBtn(32)} aria-label="decrease">
              <Minus size={14} />
            </button>
            <span style={{ ...mono(15, 600), minWidth: 26, textAlign: "center" }}>{s.sessionSize}</span>
            <button onClick={s.incSessionSize} style={iconBtn(32)} aria-label="increase">
              <Plus size={14} />
            </button>
          </div>
        </Row>
        <Divider />
        <Row label="Daily reminder">
          <Toggle on={s.reminder} onClick={() => s.toggle("reminder")} />
        </Row>
        <Divider />
        <Row label="Flashcard order">
          {segGroup(ORDER_OPTIONS, s.order, (key) => s.set("order", key))}
        </Row>
        <Divider />
        <Row label="Your language">
          <select
            aria-label="Your language"
            value={s.originLanguage}
            onChange={(e) => s.setOriginLanguage(e.target.value as OriginLanguage)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "9px 12px",
              background: "var(--panelHi)",
              color: "var(--text)",
              ...mono(13),
              cursor: "pointer",
            }}
          >
            {ORIGIN_LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="// display">
        <Row label="Theme">
          {segGroup(
            [
              ["light", "light"],
              ["dark", "dark"],
            ],
            s.theme,
            (k) => s.setTheme(k as "light" | "dark")
          )}
        </Row>
        <Divider />
        <Row label="Show phonetics on the card front">
          <Toggle on={s.showIpaFront} onClick={() => s.toggle("showIpaFront")} />
        </Row>
        <Divider />
        <Row label="Show your-language meaning on flip">
          <Toggle on={s.showOriginBack} onClick={() => s.toggle("showOriginBack")} />
        </Row>
      </Section>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "0 16px" }} />;
}
