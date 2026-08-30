"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Deck } from "@/lib/data";
import { mono } from "../shared/ui";

export default function DeckSelect({
  decks,
  value,
  onChange,
}: {
  decks: Deck[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = decks.find((d) => d.id === value);
  const filtered = q.trim()
    ? decks.filter((d) => d.name.toLowerCase().includes(q.trim().toLowerCase()))
    : decks;
  const showSearch = decks.length > 6;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 9,
          border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
          background: "var(--panelHi)",
          color: "var(--text)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current ? current.name : "choose a deck"}
        </span>
        {current && (
          <span style={{ ...mono(10.5, 500), color: "var(--faint)", textTransform: "lowercase", flex: "none" }}>
            {current.level.toLowerCase()}
          </span>
        )}
        <ChevronDown size={16} color="var(--muted)" style={{ flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "var(--panel)",
            border: "1px solid var(--borderHi)",
            borderRadius: 8,
            boxShadow: "0 12px 32px -12px rgba(0,0,0,.6)",
            overflow: "hidden",
            animation: "fadeIn .15s ease",
          }}
        >
          {showSearch && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: "1px solid var(--border)", color: "var(--faint)" }}>
              <Search size={14} />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="search decks..."
                style={{ flex: 1, background: "none", border: "none", color: "var(--text)", ...mono(13, 500) }}
              />
            </div>
          )}

          <div style={{ maxHeight: 232, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "14px 12px", ...mono(12.5), color: "var(--faint)" }}>no matching decks</div>
            )}
            {filtered.map((d) => {
              const on = d.id === value;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onChange(d.id);
                    setOpen(false);
                    setQ("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    background: on ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                    color: on ? "var(--accent)" : "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (!on) e.currentTarget.style.background = "var(--panelHi)";
                  }}
                  onMouseLeave={(e) => {
                    if (!on) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.name}
                  </span>
                  <span style={{ ...mono(10.5, 500), color: "var(--faint)", flex: "none" }}>{d.level.toLowerCase()}</span>
                  {on && <Check size={14} style={{ flex: "none" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
