import { NextResponse } from "next/server";
import { readJsonBody, readString, requireUser } from "@/lib/api/guard";
import { adminDb } from "@/lib/firebase/admin";
import { decksPath, wordsPath } from "@/lib/firestore/paths";

// Deleting a deck cascades to every word in it. The old schema faked this with
// a soft-delete timestamp that nothing ever restored, so this now hard-deletes:
// one predicate fewer on every read path, and no orphaned rows accruing cost.
//
// BulkWriter handles decks of any size (the 500-writes-per-batch limit is its
// problem, not ours) and runs server-side so a large delete does not depend on
// the browser staying open.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 400;

export async function POST(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const uid = guard.user.uid;

  const body = await readJsonBody(request);
  const deckId = readString(body.deckId, 128);
  if (!deckId) return NextResponse.json({ error: "missing_deck" }, { status: 400 });

  try {
    const db = adminDb();

    // Ownership is implied by the path — a caller can only ever address decks
    // under their own verified uid — but confirm the deck exists so a bad id
    // reports cleanly instead of silently "succeeding".
    const deckRef = db.doc(`${decksPath(uid)}/${deckId}`);
    const deck = await deckRef.get();
    if (!deck.exists) {
      return NextResponse.json({ error: "deck_not_found" }, { status: 404 });
    }

    const writer = db.bulkWriter();
    const words = db.collection(wordsPath(uid)).where("deckId", "==", deckId);

    let deleted = 0;
    for (;;) {
      const snapshot = await words.limit(PAGE).get();
      if (snapshot.empty) break;
      for (const doc of snapshot.docs) {
        void writer.delete(doc.ref);
        deleted++;
      }
      await writer.flush();
      if (snapshot.size < PAGE) break;
    }

    void writer.delete(deckRef);
    await writer.close();

    return NextResponse.json({ ok: true, deletedWords: deleted });
  } catch (error) {
    console.error("deck_delete_failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
