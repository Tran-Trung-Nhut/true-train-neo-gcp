import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { calculateNextReview, type Rating, type SM2State } from "../sm2";
import { getDb, requireUid } from "../firestore/client";
import { dailyStatsPath, reviewLogsPath, wordsPath } from "../firestore/paths";
import { stripUndefined } from "../firestore/sanitize";
import type { DailyStatsDoc, WordDoc } from "../firestore/types";
import { getDecksWithStats } from "./vocabulary";
import { dateString, deriveWordStatus, formatLocalDate } from "./shared";
import type {
  PracticeStreakSummary,
  StatsSummary,
  StreakTier,
  StudyCard,
} from "./types";

export type PracticeMode = "flashcard" | "quiz";

const DEFAULT_REVIEW_STATE: SM2State = {
  ease_factor: 2.5,
  interval_days: 0,
  repetitions: 0,
  due_date: new Date(),
};

const STREAK_THRESHOLDS: { minimum: number; tier: StreakTier }[] = [
  { minimum: 365, tier: "mythic" },
  { minimum: 200, tier: "legend" },
  { minimum: 100, tier: "nova" },
  { minimum: 75, tier: "inferno" },
  { minimum: 50, tier: "blaze" },
  { minimum: 30, tier: "ember" },
  { minimum: 14, tier: "flame" },
  { minimum: 7, tier: "spark" },
  { minimum: 0, tier: "starter" },
];

export function streakTier(streak: number): StreakTier {
  return STREAK_THRESHOLDS.find(({ minimum }) => streak >= minimum)?.tier ?? "starter";
}

export async function submitReview(
  card: StudyCard,
  rating: Rating,
  mode: PracticeMode = "flashcard"
): Promise<StudyCard> {
  const uid = requireUid();
  const db = getDb();
  const wordRef = doc(db, `${wordsPath(uid)}/${card.id}`);

  const snapshot = await getDoc(wordRef);
  if (!snapshot.exists()) throw new Error("word_not_found");
  const current = (snapshot.data() as WordDoc).sm2;

  const currentState: SM2State = current
    ? {
        ease_factor: current.easeFactor,
        interval_days: current.intervalDays,
        repetitions: current.repetitions,
        due_date: new Date(`${current.dueDate}T12:00:00`),
      }
    : DEFAULT_REVIEW_STATE;

  const nextState = calculateNextReview(currentState, rating);
  const now = new Date().toISOString();
  const today = dateString();

  const nextSm2 = {
    easeFactor: nextState.ease_factor,
    intervalDays: nextState.interval_days,
    repetitions: nextState.repetitions,
    dueDate: formatLocalDate(nextState.due_date),
    lastReviewed: now,
    totalReviews: (current?.totalReviews ?? 0) + 1,
    correctStreak: rating === 1 ? 0 : nextState.repetitions,
  };

  const batch = writeBatch(db);
  batch.update(wordRef, stripUndefined({ sm2: nextSm2, updatedAt: now }));
  batch.set(
    doc(collection(db, reviewLogsPath(uid))),
    stripUndefined({ wordId: card.id, mode, rating, createdAt: now })
  );
  batch.set(
    doc(db, `${dailyStatsPath(uid)}/${today}`),
    stripUndefined({ date: today, reviewCount: increment(1) }),
    { merge: true }
  );
  await batch.commit();

  return {
    ...card,
    reviewId: card.id,
    easeFactor: nextSm2.easeFactor,
    intervalDays: nextSm2.intervalDays,
    repetitions: nextSm2.repetitions,
    dueDate: nextSm2.dueDate,
    totalReviews: nextSm2.totalReviews,
    status: deriveWordStatus(nextSm2),
  };
}

export async function markPracticeCompleted(input: {
  mode: PracticeMode;
  reviewed: number;
  correct?: number;
}): Promise<{ increased: boolean; streak: number }> {
  const uid = requireUid();
  const db = getDb();
  const today = dateString();
  const ref = doc(db, `${dailyStatsPath(uid)}/${today}`);

  const snapshot = await getDoc(ref);
  const existing = snapshot.exists() ? (snapshot.data() as DailyStatsDoc) : null;

  if (existing?.practiceCompleted === true) {
    const summary = await getPracticeStreakSummary();
    return { increased: false, streak: summary.streak };
  }

  await setDoc(
    ref,
    stripUndefined({
      date: today,
      wordsReviewed: Math.max(existing?.wordsReviewed ?? 0, input.reviewed),
      wordsLearned: existing?.wordsLearned ?? 0,
      practiceCompleted: true,
      practiceMode: input.mode,
      practiceReviewed: input.reviewed,
      practiceCorrect: input.correct ?? null,
      practiceCompletedAt: new Date().toISOString(),
    }),
    { merge: true }
  );

  const summary = await getPracticeStreakSummary();
  await updateDoc(ref, { streakDay: summary.streak });

  return { increased: true, streak: summary.streak };
}

async function getActivePracticeDates(days: number): Promise<Set<string>> {
  const uid = requireUid();
  const snapshot = await getDocs(
    query(
      collection(getDb(), dailyStatsPath(uid)),
      where("date", ">=", dateString(-days)),
      orderBy("date")
    )
  );

  const active = new Set<string>();
  for (const entry of snapshot.docs) {
    const row = entry.data() as DailyStatsDoc;
    if (row.practiceCompleted === true || (row.reviewCount ?? 0) > 0 || (row.streakDay ?? 0) > 0) {
      active.add(row.date);
    }
  }
  return active;
}

export async function getPracticeStreakSummary(days = 126): Promise<PracticeStreakSummary> {
  const range = Math.max(1, Math.floor(days));
  const activeDates = await getActivePracticeDates(range);
  const practicedToday = activeDates.has(dateString());

  let streak = 0;
  for (let offset = practicedToday ? 0 : -1; offset > -range; offset--) {
    if (!activeDates.has(dateString(offset))) break;
    streak++;
  }

  return {
    streak,
    practicedToday,
    lastActiveDate: [...activeDates].sort().at(-1) ?? null,
    tier: streakTier(streak),
  };
}

export async function getStatsSummary(): Promise<StatsSummary> {
  const uid = requireUid();
  const logs = collection(getDb(), reviewLogsPath(uid));

  const [{ decks }, totalLogs, correctLogs] = await Promise.all([
    getDecksWithStats(),
    getCountFromServer(query(logs)),
    getCountFromServer(query(logs, where("rating", ">=", 3))),
  ]);

  const totalWords = decks.reduce((sum, deck) => sum + deck.total, 0);
  const learned = decks.reduce((sum, deck) => sum + deck.learned, 0);
  const due = decks.reduce((sum, deck) => sum + deck.due, 0);
  const totalLogCount = totalLogs.data().count;
  const correctLogCount = correctLogs.data().count;
  const accuracy = totalLogCount ? Math.round((correctLogCount / totalLogCount) * 100) : 0;

  return {
    totalWords,
    learned,
    due,
    accuracy,
    perDeck: decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      learned: deck.learned,
      total: deck.total,
    })),
  };
}

export async function getDailyCounts(days = 30): Promise<number[]> {
  const range = Math.max(1, Math.floor(days));
  const uid = requireUid();
  const snapshot = await getDocs(
    query(
      collection(getDb(), dailyStatsPath(uid)),
      where("date", ">=", dateString(-(range - 1))),
      orderBy("date")
    )
  );

  const dateIndexes = new Map<string, number>();
  for (let index = 0; index < range; index++) {
    dateIndexes.set(dateString(index - range + 1), index);
  }

  const buckets = new Array<number>(range).fill(0);
  for (const entry of snapshot.docs) {
    const row = entry.data() as DailyStatsDoc;
    const index = dateIndexes.get(row.date);
    if (index === undefined) continue;
    buckets[index] = row.reviewCount ?? 0;
    if (row.practiceCompleted === true) buckets[index] = Math.max(1, buckets[index]);
  }
  return buckets;
}
