// Every path is rooted at the owner's uid. Nothing in this app is stored
// outside /users/{uid}, which is what makes the single ownership predicate in
// firestore.rules sufficient.

export const userPath = (uid: string) => `users/${uid}`;
export const decksPath = (uid: string) => `users/${uid}/decks`;
export const wordsPath = (uid: string) => `users/${uid}/words`;
export const reviewLogsPath = (uid: string) => `users/${uid}/reviewLogs`;
export const dailyStatsPath = (uid: string) => `users/${uid}/dailyStats`;
export const settingsPath = (uid: string) => `users/${uid}/settings`;
export const aiUsagePath = (uid: string) => `users/${uid}/aiUsage`;

export const SETTINGS_DOC = "preferences";

export const aiUsageId = (date: string, kind: string) => `${date}_${kind}`;
