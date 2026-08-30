"use client";

import { useEffect, useRef } from "react";
import { parseSegs } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Logo, mono, panel, solidBtn } from "../shared/ui";

export default function Chat() {
  const chat = useStore((s) => s.chat);
  const chatInput = useStore((s) => s.chatInput);
  const aiTyping = useStore((s) => s.aiTyping);
  const chatError = useStore((s) => s.chatError);
  const set = useStore((s) => s.set);
  const chatSend = useStore((s) => s.chatSend);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, aiTyping]);

  return (
    <div className="chat-shell" style={{ ...panel, maxWidth: 660, margin: "0 auto", padding: 16 }}>
      <div style={{ ...mono(11.5), color: "var(--accent)" }}>{"// chat with your ai tutor"}</div>

      <div className="chat-messages" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
        {chat.map((m, i) => {
          const isAi = m.role === "ai";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                flexDirection: isAi ? "row" : "row-reverse",
                animation: "fadeIn .25s ease",
              }}
            >
              {isAi && (
                <span
                  style={{
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid var(--borderHi)",
                    background: "var(--panelHi)",
                  }}
                >
                  <Logo size={22} />
                </span>
              )}
              <div
                style={{
                  ...panel,
                  maxWidth: "78%",
                  padding: "11px 14px",
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  background: isAi ? "var(--panel)" : "var(--panelHi)",
                }}
              >
                {parseSegs(m.text).map((seg, j) =>
                  seg.hl ? (
                    <span key={j} style={{ ...mono(13.5, 600), color: "var(--accent)" }}>
                      {seg.text}
                    </span>
                  ) : (
                    <span key={j}>{seg.text}</span>
                  )
                )}
              </div>
            </div>
          );
        })}

        {aiTyping && (
          <div style={{ display: "flex", gap: 10 }}>
            <span
              style={{
                flex: "none",
                display: "grid",
                placeItems: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--borderHi)",
                background: "var(--panelHi)",
              }}
            >
              <Logo size={22} />
            </span>
            <div style={{ ...panel, padding: "14px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              <span className="typing-dot" style={{ animationDelay: "0s" }} />
              <span className="typing-dot" style={{ animationDelay: ".18s" }} />
              <span className="typing-dot" style={{ animationDelay: ".36s" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-row" style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input
          value={chatInput}
          onChange={(e) => set("chatInput", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              chatSend();
            }
          }}
          placeholder="type your English sentence…"
          style={{
            flex: 1,
            padding: "11px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            ...mono(13.5, 500),
          }}
        />
        <button onClick={chatSend} className="solid-btn" style={{ ...solidBtn, padding: "10px 18px" }}>
          {chatError ? "retry" : "send"}
        </button>
      </div>

      {chatError && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--bad)",
            background: "color-mix(in srgb, var(--bad) 10%, transparent)",
            color: "var(--bad)",
            ...mono(12),
          }}
        >
          {chatError}
        </div>
      )}
    </div>
  );
}
