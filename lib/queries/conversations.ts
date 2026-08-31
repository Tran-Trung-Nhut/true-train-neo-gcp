import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb, requireUid } from "../firestore/client";
import { conversationMessagesPath, conversationsPath } from "../firestore/paths";
import { stripUndefined } from "../firestore/sanitize";
import type { ChatMessageDoc, ConversationDoc } from "../firestore/types";
import type { ChatMsg } from "../store/types";


export const CONVERSATION_LIST_LIMIT = 50;
export const CONVERSATION_MESSAGE_LIMIT = 200;

const MAX_TITLE = 120;
const MAX_TEXT = 4000;
const MAX_PREVIEW = 160;
const DELETE_PAGE = 300;

export interface ConversationSummary {
  id: string;
  title: string;
  deckId: string;
  deckName: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

export function conversationTitleFrom(text: string): string {
  const clean = clamp(text, MAX_TITLE);
  return clean || "New conversation";
}

function toSummary(id: string, data: ConversationDoc): ConversationSummary {
  return {
    id,
    title: data.title || "New conversation",
    deckId: data.deckId ?? "",
    deckName: data.deckName ?? "",
    lastMessage: data.lastMessage ?? "",
    messageCount: Number(data.messageCount ?? 0),
    createdAt: data.createdAt ?? "",
    updatedAt: data.updatedAt ?? data.createdAt ?? "",
  };
}

export async function listConversations(
  max = CONVERSATION_LIST_LIMIT
): Promise<ConversationSummary[]> {
  const uid = requireUid();
  const snapshot = await getDocs(
    query(
      collection(getDb(), conversationsPath(uid)),
      orderBy("updatedAt", "desc"),
      fsLimit(max)
    )
  );
  return snapshot.docs.map((entry) => toSummary(entry.id, entry.data() as ConversationDoc));
}

export async function createConversation(input: {
  title: string;
  deckId?: string;
  deckName?: string;
}): Promise<ConversationSummary> {
  const uid = requireUid();
  const now = new Date().toISOString();
  const payload: ConversationDoc = {
    title: conversationTitleFrom(input.title),
    deckId: clamp(input.deckId, 128),
    deckName: clamp(input.deckName, 120),
    lastMessage: "",
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const created = await addDoc(
    collection(getDb(), conversationsPath(uid)),
    stripUndefined(payload)
  );
  return toSummary(created.id, payload);
}

export async function getConversationMessages(
  conversationId: string,
  max = CONVERSATION_MESSAGE_LIMIT
): Promise<ChatMsg[]> {
  const uid = requireUid();
  const snapshot = await getDocs(
    query(
      collection(getDb(), conversationMessagesPath(uid, conversationId)),
      orderBy("createdAt"),
      fsLimit(max)
    )
  );
  return snapshot.docs.map((entry) => {
    const data = entry.data() as ChatMessageDoc;
    return { role: data.role === "ai" ? "ai" : "user", text: data.text ?? "" };
  });
}

export async function appendTurn(
  conversationId: string,
  userMessage: string,
  aiMessage: string,
  currentCount: number
): Promise<void> {
  const uid = requireUid();
  const db = getDb();
  const now = new Date().toISOString();
  const messages = collection(db, conversationMessagesPath(uid, conversationId));

  const batch = writeBatch(db);
  batch.set(
    doc(messages),
    stripUndefined({ role: "user", text: clampText(userMessage, MAX_TEXT), createdAt: now })
  );
  batch.set(
    doc(messages),
    stripUndefined({
      role: "ai",
      text: clampText(aiMessage, MAX_TEXT),
      createdAt: new Date(Date.parse(now) + 1).toISOString(),
    })
  );
  batch.update(
    doc(db, `${conversationsPath(uid)}/${conversationId}`),
    stripUndefined({
      lastMessage: clamp(aiMessage, MAX_PREVIEW),
      messageCount: currentCount + 2,
      updatedAt: now,
    })
  );
  await batch.commit();
}

export async function renameConversation(
  conversationId: string,
  title: string
): Promise<string> {
  const uid = requireUid();
  const next = conversationTitleFrom(title);
  await updateDoc(doc(getDb(), `${conversationsPath(uid)}/${conversationId}`), {
    title: next,
    updatedAt: new Date().toISOString(),
  });
  return next;
}

export async function setConversationDeck(
  conversationId: string,
  deckId: string,
  deckName: string
): Promise<void> {
  const uid = requireUid();
  await updateDoc(doc(getDb(), `${conversationsPath(uid)}/${conversationId}`), {
    deckId: clamp(deckId, 128),
    deckName: clamp(deckName, 120),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const uid = requireUid();
  const db = getDb();
  const messages = collection(db, conversationMessagesPath(uid, conversationId));

  for (;;) {
    const snapshot = await getDocs(query(messages, fsLimit(DELETE_PAGE)));
    if (snapshot.empty) break;
    const batch = writeBatch(db);
    for (const entry of snapshot.docs) batch.delete(entry.ref);
    await batch.commit();
    if (snapshot.size < DELETE_PAGE) break;
  }

  await deleteDoc(doc(db, `${conversationsPath(uid)}/${conversationId}`));
}
