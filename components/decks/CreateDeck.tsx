"use client";

import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { chipStyle, grotesk, mono, solidBtn, ghostBtn } from "../shared/ui";

const LEVELS: ["Academic" | "General", string][] = [
  ["Academic", "academic"],
  ["General", "general"],
];

export default function CreateDeck() {
  const open = useStore((s) => s.deckModalOpen);
  const name = useStore((s) => s.deckDraftName);
  const level = useStore((s) => s.deckDraftLevel);
  const set = useStore((s) => s.set);
  const close = useStore((s) => s.closeDeckModal);
  const confirm = useStore((s) => s.confirmCreateDeck);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "grid", placeItems: "center", padding: 24 }}>
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(4,7,13,.55)", animation: "fadeIn .2s ease" }} />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: "var(--bg)",
          border: "1px solid var(--borderHi)",
          borderRadius: 8,
          padding: 24,
          animation: "fadeIn .2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ ...mono(12), color: "var(--accent)" }}>{"// new deck"}</div>
            <h2 style={{ ...grotesk(22), marginTop: 6 }}>Create a deck</h2>
          </div>
          <button
            onClick={close}
            aria-label="close"
            style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={{ ...mono(11), color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0 }}>deck name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => set("deckDraftName", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void confirm();
            }}
            placeholder="e.g. Environment & climate"
            style={{ width: "100%", marginTop: 7, padding: "11px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panelHi)", color: "var(--text)", fontSize: 14 }}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={{ ...mono(11), color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0 }}>category</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {LEVELS.map(([k, l]) => (
              <button key={k} onClick={() => set("deckDraftLevel", k)} style={chipStyle(level === k)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 26 }}>
          <button onClick={close} className="ghost-btn" style={ghostBtn}>
            cancel
          </button>
          <button
            onClick={() => void confirm()}
            disabled={!name.trim()}
            className="solid-btn"
            style={{ ...solidBtn, opacity: name.trim() ? 1 : 0.55 }}
          >
            create deck
          </button>
        </div>
      </div>
    </div>
  );
}
