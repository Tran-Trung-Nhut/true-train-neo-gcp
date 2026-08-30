import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { adminDb } from "@/lib/firebase/admin";
import { decksPath, wordsPath } from "@/lib/firestore/paths";
import type { DeckDoc } from "@/lib/firestore/types";

// Replaces the deck_stats Postgres RPC.
//
// Firestore has no GROUP BY, so per-deck totals are computed with count()
// aggregation queries — billed one read per 1000 documents matched, which is
// far cheaper than the full-table scan this replaces. All of it runs on the
// server so the browser makes one request regardless of deck count.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localToday(offsetMinutes: number): string {
  const now = new Date(Date.now() - offsetMinutes * 60_000);
  return now.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const uid = guard.user.uid;

  // The client sends its UTC offset so "due today" matches the user's calendar
  // day rather than the server's.
  const url = new URL(request.url);
  const rawOffset = Number(url.searchParams.get("tzOffset"));
  const offsetMinutes = Number.isFinite(rawOffset) ? Math.max(-840, Math.min(840, rawOffset)) : 0;
  const today = localToday(offsetMinutes);

  try {
    const db = adminDb();
    const deckSnapshot = await db.collection(decksPath(uid)).orderBy("createdAt").get();
    const words = db.collection(wordsPath(uid));

    const rows = await Promise.all(
      deckSnapshot.docs.map(async (deckDoc) => {
        const deck = deckDoc.data() as DeckDoc;
        const scoped = words.where("deckId", "==", deckDoc.id);

        const [total, learned, due] = await Promise.all([
          scoped.count().get(),
          scoped.where("sm2.repetitions", ">=", 3).count().get(),
          scoped.where("sm2.dueDate", "<=", today).count().get(),
        ]);

        return {
          id: deckDoc.id,
          name: deck.name ?? "",
          category: deck.category ?? "",
          description: deck.description ?? "",
          total: total.data().count,
          learned: learned.data().count,
          due: due.data().count,
        };
      })
    );

    return NextResponse.json({ decks: rows });
  } catch (error) {
    console.error("deck_stats_failed", error);
    return NextResponse.json({ error: "stats_failed" }, { status: 500 });
  }
}
