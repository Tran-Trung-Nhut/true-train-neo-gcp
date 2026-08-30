"use client";

import { useState } from "react";
import type { EnrichChoice } from "@/lib/store";
import { PARTS_OF_SPEECH } from "@/lib/part-of-speech";
import { grotesk, mono } from "../shared/ui";

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  fontWeight: 500,
  color: "var(--faint)",
  textTransform: "uppercase",
};

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--panelHi)",
  color: "var(--text)",
  fontSize: 14,
};

export function Field({
  label,
  value,
  onChange,
  mono: useMonoFont,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  textarea?: boolean;
}) {
  const style = { ...FIELD_STYLE, fontFamily: useMonoFont ? "var(--font-mono)" : "inherit" };
  return (
    <div>
      <div style={LABEL_STYLE}>{label}</div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={2}
          style={{ ...style, resize: "vertical" }}
        />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} style={style} />
      )}
    </div>
  );
}

export function PartOfSpeechChips({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preferred = PARTS_OF_SPEECH.slice(0, 4);
  const showAll = expanded || (value && !preferred.includes(value as (typeof PARTS_OF_SPEECH)[number]));
  const options = showAll ? PARTS_OF_SPEECH : preferred;

  return (
    <div>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7, maxWidth: "100%" }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            style={chipStyle(value === option)}
          >
            {option}
          </button>
        ))}
        <button type="button" onClick={() => setExpanded(!expanded)} style={chipStyle(false)}>
          {expanded ? "less" : `+${PARTS_OF_SPEECH.length - preferred.length}`}
        </button>
      </div>
    </div>
  );
}

export function ModeButton({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        minHeight: 34,
        padding: "7px 10px",
        borderRadius: 6,
        border: active ? "1px solid var(--accent)" : "1px solid transparent",
        background: active
          ? accent
            ? "color-mix(in srgb, var(--accent) 14%, var(--panelHi))"
            : "var(--panelHi)"
          : "transparent",
        color: active ? "var(--text)" : "var(--muted)",
        cursor: "pointer",
        ...mono(12, active ? 700 : 600),
      }}
    >
      {children}
    </button>
  );
}

export function ChoiceGroup({
  title,
  items,
  onPick,
  getHeading,
  getBody,
}: {
  title: string;
  items: EnrichChoice[];
  onPick: (item: EnrichChoice) => void;
  getHeading: (item: EnrichChoice) => string;
  getBody: (item: EnrichChoice) => string;
}) {
  return (
    <div>
      <div style={LABEL_STYLE}>{title}</div>
      <div style={{ display: "grid", gap: 8, marginTop: 7 }}>
        {items.map((item, index) => (
          <button
            key={`${getHeading(item)}-${index}`}
            type="button"
            onClick={() => onPick(item)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 11px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "block", ...grotesk(14) }}>{getHeading(item)}</span>
            <span
              style={{
                display: "block",
                marginTop: 3,
                color: "var(--muted)",
                fontSize: 12.5,
                lineHeight: 1.45,
              }}
            >
              {getBody(item)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flex: "0 0 auto",
    minHeight: 30,
    padding: "6px 9px",
    borderRadius: 7,
    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: active
      ? "color-mix(in srgb, var(--accent) 14%, var(--panelHi))"
      : "var(--panel)",
    color: active ? "var(--text)" : "var(--muted)",
    cursor: "pointer",
    ...mono(11.5, active ? 700 : 500),
  };
}
