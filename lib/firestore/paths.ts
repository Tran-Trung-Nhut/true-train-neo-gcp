// Everything is rooted at /users/{uid}, which is what lets firestore.rules use
// a single ownership predicate.

export const userPath = (uid: string) => `users/${uid}`;
export const decksPath = (uid: string) => `users/${uid}/decks`;
export const wordsPath = (uid: string) => `users/${uid}/words`;
export const reviewLogsPath = (uid: string) => `users/${uid}/reviewLogs`;
export const dailyStatsPath = (uid: string) => `users/${uid}/dailyStats`;
export const settingsPath = (uid: string) => `users/${uid}/settings`;
export const aiUsagePath = (uid: string) => `users/${uid}/aiUsage`;
export const conversationsPath = (uid: string) => `users/${uid}/conversations`;
export const conversationMessagesPath = (uid: string, conversationId: string) =>
  `users/${uid}/conversations/${conversationId}/messages`;

export const SETTINGS_DOC = "preferences";

export const aiUsageId = (date: string, kind: string) => `${date}_${kind}`;
