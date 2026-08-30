// Edge-safe session constants.
//
// middleware.ts runs on the Edge runtime and must not pull in firebase-admin,
// so the cookie name and lifetime live here and session.ts re-exports them.
// One source of truth, no Node-only imports.

// __session is the only cookie name Google Front End / Firebase Hosting
// forwards through its CDN layer, so it is the safe choice on Cloud Run.
export const SESSION_COOKIE = "__session";

// Firebase caps session cookies at 14 days; 5 keeps the revocation window tight.
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;
