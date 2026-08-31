"use client";

import { useEffect } from "react";
import { BookOpen, MessageSquarePlus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { grotesk, mono, panel } from "../shared/ui";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Compact enough for a 264px rail: "now", "12m", "5h", "3d", then a date.
function relativeTime(iso: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  const elapsed = Date.now() - at;
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ConversationList() {
  const conversations = useStore((s) => s.conversations);
  const loading = useStore((s) => s.conversationsLoading);
  const error = useStore((s) => s.conversationsError);
  const activeId = useStore((s) => s.activeConversationId);
  const listOpen = useStore((s) => s.chatListOpen);
  const loadConversations = useStore((s) => s.loadConversations);
  const openConversation = useStore((s) => s.openConversation);
  const removeConversation = useStore((s) => s.removeConversation);
  const newConversation = useStore((s) => s.newConversation);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  return (
    <aside
      className={`chat-rail ${listOpen ? "is-open" : ""}`}
      style={{ ...panel, padding: 10 }}
      aria-label="Your conversations"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "4px 4px 10px",
        }}
      >
        <span style={{ ...mono(11.5), color: "var(--accent)" }}>{"// conversations"}</span>
        <button
          onClick={newConversation}
          title="Start a new conversation"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 9px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--panelHi)",
            color: "var(--muted)",
            ...mono(11.5, 600),
            cursor: "pointer",
          }}
        >
          <MessageSquarePlus size={14} /> new
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            margin: "0 4px 10px",
            padding: "10px 11px",
            borderRadius: 8,
            border: "1px solid color-mix(in srgb, var(--bad) 40%, var(--border))",
            background: "color-mix(in srgb, var(--bad) 8%, transparent)",
          }}
        >
          <div style={{ ...mono(11.5), color: "var(--muted)", lineHeight: 1.5 }}>{error}</div>
          <button
            onClick={() => void loadConversations()}
            style={{
              marginTop: 8,
              padding: "5px 9px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--text)",
              ...mono(11, 600),
              cursor: "pointer",
            }}
          >
            retry
          </button>
        </div>
      )}

      <div className="chat-rail-list" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {loading && conversations.length === 0 && (
          <>
            <div className="skeleton" style={{ height: 58, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 58, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 58, borderRadius: 8 }} />
          </>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div style={{ padding: "22px 10px", textAlign: "center" }}>
            <div style={{ ...mono(12, 600), color: "var(--muted)" }}>No conversations yet</div>
            <div style={{ ...mono(11.5), color: "var(--faint)", marginTop: 6, lineHeight: 1.5 }}>
              Send a message and it will be saved here.
            </div>
          </div>
        )}

        {conversations.map((conversation) => {
          const active = conversation.id === activeId;
          return (
            <div
              key={conversation.id}
              className="chat-row"
              style={{
                position: "relative",
                borderRadius: 8,
                border: active
                  ? "1px solid color-mix(in srgb, var(--accent) 38%, var(--border))"
                  : "1px solid transparent",
                background: active
                  ? "color-mix(in srgb, var(--accent) 10%, var(--panel))"
                  : "transparent",
                transition: "background .15s, border-color .15s",
              }}
            >
              <button
                onClick={() => void openConversation(conversation.id)}
                aria-current={active ? "true" : undefined}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 34px 10px 11px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                <span
                  style={{
                    ...grotesk(13.5),
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: active ? "var(--accent)" : "var(--text)",
                  }}
                >
                  {conversation.title}
                </span>

                <span
                  style={{
                    ...mono(11),
                    color: "var(--faint)",
                    display: "block",
                    marginTop: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conversation.lastMessage || "no replies yet"}
                </span>

                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginTop: 7,
                    flexWrap: "wrap",
                  }}
                >
                  {conversation.deckName && (
                    <span
                      style={{
                        ...mono(10),
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        maxWidth: 130,
                        padding: "2px 6px",
                        borderRadius: 5,
                        border: "1px solid var(--border)",
                        color: "var(--muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <BookOpen size={10} />
                      {conversation.deckName}
                    </span>
                  )}
                  <span style={{ ...mono(10), color: "var(--faint)" }}>
                    {relativeTime(conversation.updatedAt)}
                  </span>
                </span>
              </button>

              <button
                className="chat-row-delete"
                aria-label={`Delete conversation ${conversation.title}`}
                onClick={() => void removeConversation(conversation.id)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 7,
                  display: "grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
