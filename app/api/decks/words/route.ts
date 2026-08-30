import { NextResponse } from "next/server";
import { clampInt, readString, requireUser } from "@/lib/api/guard";
import { adminDb } from "@/lib/firebase/admin";
import { wordsPath } from "@/lib/firestore/paths";
import { matchesTerms, parseSearchTerms } from "@/lib/firestore/search";
import type { WordDoc } from "@/lib/firestore/types";
import { mapStudyCard } from "@/lib/queries/shared";
import { VOCABULARY_PAGE_SIZE } from "@/lib/vocabulary-config";

// Numbered-page pagination needs offset(), which only the Admin SDK provides.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 50;
const STATUSES = new Set(["all", "new", "learning", "learned"]);

export async function GET(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const uid = guard.user.uid;

  const url = new URL(request.url);
  const deckId = readString(url.searchParams.get("deckId"), 128);
  if (!deckId) {
    return NextResponse.json({ error: "missing_deck" }, { status: 400 });
  }

  const pageSize = clampInt(url.searchParams.get("pageSize"), 1, MAX_PAGE_SIZE, VOCABULARY_PAGE_SIZE);
  const requestedPage = clampInt(url.searchParams.get("page"), 1, 100_000, 1);
  const rawStatus = readString(url.searchParams.get("status"), 16) || "all";
  const status = STATUSES.has(rawStatus) ? rawStatus : "all";
  const { primary, rest } = parseSearchTerms(readString(url.searchParams.get("search"), 120));

  try {
    const db = adminDb();
    let query = db.collection(wordsPath(uid)).where("deckId", "==", deckId);

    // Only one array-contains filter per query; the rest filter the page.
    if (primary) query = query.where("searchTokens", "array-contains", primary);

    if (status === "new") {
      query = query.where("sm2.repetitions", "==", 0);
    } else if (status === "learning") {
      query = query.where("sm2.repetitions", "in", [1, 2]);
    } else if (status === "learned") {
      query = query.where("sm2.repetitions", ">=", 3);
    }

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);

    // An open-ended range must be the first ordering key.
    const ordered =
      status === "learned"
        ? query.orderBy("sm2.repetitions").orderBy("createdAt")
        : query.orderBy("createdAt");

    const snapshot = await ordered
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const words = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as WordDoc }))
      .filter(({ data }) => matchesTerms(data.searchTokens ?? [], rest))
      .map(({ id, data }) => mapStudyCard(id, data));

    return NextResponse.json({ words, total, page, pageSize });
  } catch (error) {
    console.error("deck_words_failed", error);
    return NextResponse.json({ error: "words_failed" }, { status: 500 });
  }
}
