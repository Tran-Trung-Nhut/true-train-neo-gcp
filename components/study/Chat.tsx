"use client";

import { useEffect, useRef } from "react";
import { BookOpen, MessagesSquare } from "lucide-react";
import { parseSegs } from "@/lib/data";
import { useStore } from "@/lib/store";
import ConversationList from "./ConversationList";
import { Logo, mono, panel, solidBtn } from "../shared/ui";

const GENERAL_DECK = "";

export default function Chat() {
  const chat = useStore((s) => s.chat);
  const chatInput = useStore((s) => s.chatInput);
  const aiTyping = useStore((s) => s.aiTyping);
  const chatError = useStore((s) => s.chatError);
  const chatSaveError = useStore((s) => s.chatSaveError);
  const chatSaving = useStore((s) => s.chatSaving);
  const chatLoading = useStore((s) => s.chatLoading);
  const chatDeckId = useStore((s) => s.chatDeckId);
  const decks = useStore((s) => s.decks);
  const activeDeckId = useStore((s) => s.activeDeckId);
  const conversations = useStore((s) => s.conversations);
  const set = useStore((s) => s.set);
  const chatSend = useStore((s) => s.chatSend);
  const setChatDeck = useStore((s) => s.setChatDeck);
  const retryChatSave = useStore((s) => s.retryChatSave);
  const toggleChatList = useStore((s) => s.toggleChatList);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, aiTyping]);

  // Arriving from a study session, the deck being studied is the obvious
  // default. Only seeded once, so an explicit switch to general chat sticks.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (!chatDeckId && activeDeckId) void setChatDeck(activeDeckId);
  }, [activeDeckId, chatDeckId, setChatDeck]);

  const deck = decks.find((d) => d.id === chatDeckId);

  return (
    <div className="chat-layout">
      <ConversationList />

      <div className="chat-shell" style={{ ...panel, padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            flex: "none",
          }}
        >
          <span style={{ ...mono(11.5), color: "var(--accent)" }}>
            {"// chat with your ai tutor"}
          </span>

          <div style={{ flex: 1 }} />

          <button
            className="chat-rail-toggle"
            onClick={toggleChatList}
            style={{
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panelHi)",
              color: "var(--muted)",
              ...mono(11.5, 600),
              cursor: "pointer",
            }}
          >
            <MessagesSquare size={13} /> chats ({conversations.length})
          </button>

          {/* Grounding the chat in a deck makes the tutor use those words. */}
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 9px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panelHi)",
            }}
          >
            <BookOpen size={13} style={{ color: "var(--accent)", flex: "none" }} />
            <span style={{ ...mono(11), color: "var(--faint)" }}>deck</span>
            <select
              value={chatDeckId}
              onChange={(event) => void setChatDeck(event.target.value)}
              aria-label="Deck to chat about"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text)",
                ...mono(11.5, 600),
                cursor: "pointer",
                maxWidth: 160,
              }}
            >
              <option value={GENERAL_DECK}>general chat</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {deck && (
          <div style={{ ...mono(11), color: "var(--faint)", marginTop: 8, flex: "none" }}>
            grounded in {deck.name} — the tutor will steer towards this deck&apos;s words
          </div>
        )}

        <div
          className="chat-messages"
          style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}
        >
          {chatLoading && (
            <div style={{ ...mono(12), color: "var(--muted)", padding: "8px 2px" }}>
              loading this conversation...
            </div>
          )}

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
              <div
                style={{
                  ...panel,
                  padding: "14px 16px",
                  display: "flex",
                  gap: 5,
                  alignItems: "center",
                }}
              >
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
          <button
            onClick={chatSend}
            className="solid-btn"
            style={{ ...solidBtn, padding: "10px 18px" }}
          >
            {chatError ? "retry" : "send"}
          </button>
        </div>

        {chatError && (
          <div
            role="alert"
            style={{
              marginTop: 10,
              flex: "none",
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

        {/* The reply is on screen but not in the database. Never silent. */}
        {chatSaveError && (
          <div
            role="alert"
            style={{
              marginTop: 10,
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid color-mix(in srgb, var(--bad) 45%, var(--border))",
              background: "color-mix(in srgb, var(--bad) 8%, transparent)",
            }}
          >
            <span style={{ ...mono(12), color: "var(--muted)", flex: 1, minWidth: 180 }}>
              {chatSaveError}
            </span>
            <button
              onClick={() => void retryChatSave()}
              disabled={chatSaving}
              style={{
                padding: "6px 11px",
                borderRadius: 7,
                border: "1px solid var(--border)",
                background: "var(--panel)",
                color: "var(--text)",
                ...mono(11.5, 600),
                cursor: chatSaving ? "default" : "pointer",
                opacity: chatSaving ? 0.6 : 1,
              }}
            >
              {chatSaving ? "saving..." : "retry save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
