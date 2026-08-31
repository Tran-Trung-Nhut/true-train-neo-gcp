import { NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";
import { requireUser } from "@/lib/api/guard";
import { adminDb } from "@/lib/firebase/admin";
import { decksPath, wordsPath } from "@/lib/firestore/paths";
import type { DeckDoc } from "@/lib/firestore/types";

// Firestore has no GROUP BY, so per-deck totals use count() aggregations.
//
// Those aggregations carry no orderBy, so each one needs its own composite
// index terminating in __name__ (see firestore.indexes.json). A count that
// still fails must degrade to "stats unavailable" rather than a 500: the deck
// names are already in hand and the list stays usable without the numbers.
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

  // The client sends its UTC offset so "due today" uses its own calendar day.
  const url = new URL(request.url);
  const rawOffset = Number(url.searchParams.get("tzOffset"));
  const offsetMinutes = Number.isFinite(rawOffset) ? Math.max(-840, Math.min(840, rawOffset)) : 0;
  const today = localToday(offsetMinutes);

  const failures: unknown[] = [];
  const countOrNull = async (query: Query): Promise<number | null> => {
    try {
      return (await query.count().get()).data().count;
    } catch (error) {
      failures.push(error);
      return null;
    }
  };

  let deckSnapshot;
  try {
    deckSnapshot = await adminDb().collection(decksPath(uid)).orderBy("createdAt").get();
  } catch (error) {
    // Without the deck list there is nothing to render, so this stays fatal.
    console.error("deck_list_failed", error);
    return NextResponse.json({ error: "stats_failed" }, { status: 500 });
  }

  const words = adminDb().collection(wordsPath(uid));

  const rows = await Promise.all(
    deckSnapshot.docs.map(async (deckDoc) => {
      const deck = deckDoc.data() as DeckDoc;
      const scoped = words.where("deckId", "==", deckDoc.id);

      const [total, learned, due] = await Promise.all([
        countOrNull(scoped),
        countOrNull(scoped.where("sm2.repetitions", ">=", 3)),
        countOrNull(scoped.where("sm2.dueDate", "<=", today)),
      ]);

      return {
        id: deckDoc.id,
        name: deck.name ?? "",
        category: deck.category ?? "",
        description: deck.description ?? "",
        total: total ?? 0,
        learned: learned ?? 0,
        due: due ?? 0,
        // The UI shows "—" instead of these zeroes when this is false, so a
        // failed count is never presented as a real number.
        statsAvailable: total !== null && learned !== null && due !== null,
      };
    })
  );

  if (failures.length > 0) {
    console.error("deck_stats_partial", { failedCounts: failures.length }, failures[0]);
  }

  return NextResponse.json({ decks: rows, partial: failures.length > 0 });
}
