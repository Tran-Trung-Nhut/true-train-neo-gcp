import { NextResponse } from "next/server";
import { clampInt, readString, requireUser } from "@/lib/api/guard";
import { adminDb } from "@/lib/firebase/admin";
import { wordsPath } from "@/lib/firestore/paths";
import type { WordDoc } from "@/lib/firestore/types";
import { mapStudyCard } from "@/lib/queries/shared";
import type { StudyCard } from "@/lib/queries/types";

// Firestore requires the first orderBy to be the inequality field, so due cards
// always arrive in dueDate order. The alpha and random modes reorder a bounded
// pool of the most-due cards in memory.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUE_POOL_SIZE = 200;
const DISTRACTOR_POOL_SIZE = 200;
const ORDERS = new Set(["sm2", "alpha", "random"]);

function localToday(offsetMinutes: number): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const uid = guard.user.uid;

  const url = new URL(request.url);
  const deckId = readString(url.searchParams.get("deckId"), 128);
  if (!deckId) return NextResponse.json({ error: "missing_deck" }, { status: 400 });

  const rawOrder = readString(url.searchParams.get("order"), 16);
  const order = ORDERS.has(rawOrder) ? rawOrder : "sm2";
  const sessionSize = clampInt(url.searchParams.get("size"), 1, 200, 20);
  const offsetMinutes = clampInt(url.searchParams.get("tzOffset"), -840, 840, 0);
  const today = localToday(offsetMinutes);

  try {
    const db = adminDb();
    const words = db.collection(wordsPath(uid)).where("deckId", "==", deckId);

    const drawSize = order === "sm2" ? sessionSize : DUE_POOL_SIZE;

    let [dueSnapshot, poolSnapshot] = await Promise.all([
      words
        .where("sm2.dueDate", "<=", today)
        .orderBy("sm2.dueDate")
        .orderBy("createdAt")
        .limit(drawSize)
        .get(),
      words.orderBy("createdAt").limit(DISTRACTOR_POOL_SIZE).get(),
    ]);

    // Nothing scheduled must not mean "you cannot practise". Fall back to the
    // soonest-due cards so the deck is always reviewable ahead of time, and
    // tell the client so it can label the session honestly rather than
    // implying these cards were due. Reuses the (deckId, sm2.dueDate,
    // createdAt) index — no filter, same ordering.
    let extraPractice = false;
    if (dueSnapshot.empty) {
      dueSnapshot = await words.orderBy("sm2.dueDate").orderBy("createdAt").limit(drawSize).get();
      extraPractice = !dueSnapshot.empty;
    }

    let due: StudyCard[] = dueSnapshot.docs.map((doc) =>
      mapStudyCard(doc.id, doc.data() as WordDoc)
    );

    if (order === "alpha") {
      due = [...due].sort((a, b) => a.word.localeCompare(b.word, "en-US"));
    } else if (order === "random") {
      due = shuffle(due);
    }

    const sessionCards = due.slice(0, sessionSize);

    // deckCards must contain the session cards so quizPick can resolve any
    // answered question by id.
    const byId = new Map<string, StudyCard>();
    for (const card of sessionCards) byId.set(card.id, card);
    for (const doc of poolSnapshot.docs) {
      if (byId.has(doc.id)) continue;
      byId.set(doc.id, mapStudyCard(doc.id, doc.data() as WordDoc));
    }

    return NextResponse.json({
      sessionCards,
      deckCards: [...byId.values()],
      extraPractice,
    });
  } catch (error) {
    console.error("study_session_failed", error);
    return NextResponse.json({ error: "session_failed" }, { status: 500 });
  }
}
