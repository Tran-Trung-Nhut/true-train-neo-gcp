import {
  appendTurn,
  createConversation,
  conversationTitleFrom,
  deleteConversation,
  getConversationMessages,
  getDeckPool,
  listConversations,
  setConversationDeck,
} from "../queries";
import type { ChatMsg, StoreGet, StoreSet } from "./types";


const GREETING: ChatMsg = {
  role: "ai",
  text: "Hi! I am your English tutor. Start with any English sentence and I will chat with you and suggest fixes where useful.",
};

const CONTEXT_WORD_COUNT = 10;

export function freshChat(): ChatMsg[] {
  return [GREETING];
}

export async function loadConversations(set: StoreSet): Promise<void> {
  set({ conversationsLoading: true });
  try {
    const conversations = await listConversations();
    set({ conversations, conversationsLoading: false, conversationsError: "" });
  } catch (error) {
    console.error("loadConversations failed", error);
    set({
      conversationsLoading: false,
      conversationsError: "Could not load your conversations. They are safe — this is a connection error.",
    });
  }
}

export function newConversation(set: StoreSet, get: StoreGet): void {
  set({
    activeConversationId: "",
    chat: freshChat(),
    chatInput: "",
    chatError: "",
    chatSaveError: "",
    chatListOpen: false,
    pendingTurn: null,
  });
  void loadChatDeckContext(get().chatDeckId, set, get);
}

export async function openConversation(
  id: string,
  set: StoreSet,
  get: StoreGet
): Promise<void> {
  const summary = get().conversations.find((c) => c.id === id);
  set({
    activeConversationId: id,
    chatLoading: true,
    chatError: "",
    chatSaveError: "",
    chatListOpen: false,
    pendingTurn: null,
    chatDeckId: summary?.deckId ?? "",
  });
  try {
    const messages = await getConversationMessages(id);
    set({
      chat: messages.length ? [GREETING, ...messages] : freshChat(),
      chatLoading: false,
    });
    void loadChatDeckContext(summary?.deckId ?? "", set, get);
  } catch (error) {
    console.error("openConversation failed", error);
    set({
      chatLoading: false,
      chatError: "Could not open that conversation. Try again.",
    });
  }
}

export async function removeConversation(
  id: string,
  set: StoreSet,
  get: StoreGet
): Promise<void> {
  const previous = get().conversations;
  set({ conversations: previous.filter((c) => c.id !== id) });
  try {
    await deleteConversation(id);
    if (get().activeConversationId === id) newConversation(set, get);
    get().notify("Conversation deleted.");
  } catch (error) {
    console.error("deleteConversation failed", error);
    set({ conversations: previous });
    get().notify("Could not delete that conversation. Try again.", "error");
  }
}

export async function loadChatDeckContext(
  deckId: string,
  set: StoreSet,
  get: StoreGet
): Promise<void> {
  if (!deckId) {
    set({ chatDeckWords: [] });
    return;
  }
  try {
    const cards = await getDeckPool(deckId, CONTEXT_WORD_COUNT);
    if (get().chatDeckId !== deckId) return;
    set({ chatDeckWords: cards });
  } catch {
    set({ chatDeckWords: [] });
  }
}

export async function setChatDeck(
  deckId: string,
  set: StoreSet,
  get: StoreGet
): Promise<void> {
  const deck = get().decks.find((d) => d.id === deckId);
  set({ chatDeckId: deckId, chatDeckWords: [] });
  await loadChatDeckContext(deckId, set, get);

  const conversationId = get().activeConversationId;
  if (!conversationId) return;
  try {
    await setConversationDeck(conversationId, deckId, deck?.name ?? "");
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, deckId, deckName: deck?.name ?? "" } : c
      ),
    }));
  } catch (error) {
    console.error("setConversationDeck failed", error);
    get().notify("Could not save the deck for this conversation.", "error");
  }
}

async function persistTurn(
  conversationId: string,
  userText: string,
  aiText: string,
  set: StoreSet,
  get: StoreGet
): Promise<boolean> {
  const summary = get().conversations.find((c) => c.id === conversationId);
  try {
    await appendTurn(conversationId, userText, aiText, summary?.messageCount ?? 0);
    set((s) => ({
      chatSaveError: "",
      pendingTurn: null,
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: aiText.slice(0, 160),
              messageCount: c.messageCount + 2,
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    }));
    return true;
  } catch (error) {
    console.error("appendTurn failed", error);
    set({
      chatSaveError:
        "This reply is not saved yet. It stays on screen — retry to store it in your history.",
      pendingTurn: { conversationId, userText, aiText },
    });
    return false;
  }
}

export async function retryChatSave(set: StoreSet, get: StoreGet): Promise<void> {
  const pending = get().pendingTurn;
  if (!pending) return;
  set({ chatSaving: true });
  const ok = await persistTurn(
    pending.conversationId,
    pending.userText,
    pending.aiText,
    set,
    get
  );
  set({ chatSaving: false });
  if (ok) get().notify("Conversation saved.");
}

export async function chatSend(set: StoreSet, get: StoreGet): Promise<void> {
  const state = get();
  const text = state.chatInput.trim();
  if (!text || state.aiTyping) return;

  const history: ChatMsg[] = [...state.chat, { role: "user", text }];
  const typed = state.chatInput;
  const deck = state.decks.find((d) => d.id === state.chatDeckId);

  set({ chat: history, chatInput: "", aiTyping: true, chatError: "" });

  const restore = () =>
    set((s) => ({
      chat: s.chat.slice(0, -1),
      chatInput: typed,
      chatError: "Could not reach the AI. Your message was kept — try again.",
      aiTyping: false,
    }));

  let conversationId = state.activeConversationId;
  if (!conversationId) {
    try {
      const created = await createConversation({
        title: conversationTitleFrom(text),
        deckId: state.chatDeckId,
        deckName: deck?.name ?? "",
      });
      conversationId = created.id;
      set((s) => ({
        activeConversationId: created.id,
        conversations: [created, ...s.conversations],
      }));
    } catch (error) {
      console.error("createConversation failed", error);
      restore();
      set({ chatError: "Could not start a new conversation. Check your connection and try again." });
      return;
    }
  }

  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: history,
        context: deck
          ? {
              deckName: deck.name,
              deckLevel: deck.level,
              targetWords: get().chatDeckWords.map((card) => ({
                word: card.word,
                pos: card.pos,
                defEn: card.defEn,
                example: card.exEn,
              })),
            }
          : undefined,
      }),
    });

    if (res.status === 429) {
      const d = await res.json().catch(() => ({ limit: 10 }));
      const notice = `You have used all ${d.limit ?? 10} AI chat turns for today. Come back tomorrow!`;
      set((s) => ({ chat: [...s.chat, { role: "ai", text: notice }], aiTyping: false }));
      await persistTurn(conversationId, text, notice, set, get);
      return;
    }

    if (!res.ok) throw new Error("chat_failed");

    const d = await res.json();
    const reply = typeof d.reply === "string" && d.reply.trim() ? d.reply : "…";
    set((s) => ({ chat: [...s.chat, { role: "ai", text: reply }], aiTyping: false }));

    await persistTurn(conversationId, text, reply, set, get);
  } catch {
    restore();
  }
}
