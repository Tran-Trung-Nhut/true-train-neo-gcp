"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

const MONO = "var(--font-mono), monospace";
const GROTESK = "var(--font-grotesk), system-ui, sans-serif";

export const mono = (size = 12, weight = 500): CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  fontWeight: weight,
});

export const grotesk = (size: number, weight = 600): CSSProperties => ({
  fontFamily: GROTESK,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: 0,
});

export const chipStyle = (on: boolean): CSSProperties => ({
  padding: "8px 13px",
  borderRadius: 8,
  border: on ? "1px solid var(--accent)" : "1px solid var(--border)",
  fontFamily: MONO,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  background: on
    ? "color-mix(in srgb, var(--accent) 14%, var(--panel))"
    : "var(--panel)",
  color: on ? "var(--accent)" : "var(--muted)",
  boxShadow: on ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 16%, transparent)" : "none",
  transition: "border-color .15s, color .15s, background .15s, transform .15s",
});

export const sideTabStyle = (on: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 9,
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 8,
  border: on ? "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" : "1px solid transparent",
  fontFamily: MONO,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  background: on
    ? "color-mix(in srgb, var(--accent) 13%, var(--panel))"
    : "transparent",
  color: on ? "var(--accent)" : "var(--muted)",
  transition: "border-color .15s, color .15s, background .15s",
});

export const ghostBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 13px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--panel)",
  color: "var(--muted)",
  fontFamily: MONO,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "var(--shadowSm)",
};

export const solidBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 15px",
  borderRadius: 8,
  border: "1px solid var(--accent)",
  background: "var(--accent)",
  color: "#fff",
  fontFamily: MONO,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "var(--shadowAccent)",
};

export const panel: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  boxShadow: "var(--shadowSm)",
};

export const iconBtn = (size = 34, radius = 9): CSSProperties => ({
  display: "grid",
  placeItems: "center",
  width: size,
  height: size,
  borderRadius: Math.min(radius, 8),
  border: "1px solid var(--border)",
  background: "var(--panel)",
  color: "var(--muted)",
  cursor: "pointer",
  boxShadow: "var(--shadowSm)",
});

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      style={{
        position: "relative",
        width: 44,
        height: 25,
        borderRadius: 13,
        border: "none",
        cursor: "pointer",
        transition: "background .2s",
        background: on ? "var(--accent)" : "var(--track)",
        flex: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 19,
          height: 19,
          borderRadius: "50%",
          background: "#fff",
          transition: "transform .2s",
          transform: on ? "translateX(19px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="TRUETRAINNEO"
      width={size}
      height={size}
      style={{ height: size, width: "auto", objectFit: "contain" }}
      priority
    />
  );
}

export function Wordmark() {
  return (
    <span style={{ ...mono(15, 600), color: "var(--text)", letterSpacing: 0 }}>
      truetrainneo
      <span className="blink" style={{ color: "var(--accent)" }}>
        _
      </span>
    </span>
  );
}

export function Comment({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ ...mono(12.5), color: "var(--accent)" }}>{children}</span>
  );
}
