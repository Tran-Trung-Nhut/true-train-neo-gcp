// Kept free of firebase-admin imports so middleware.ts can use it on the Edge runtime.

// __session is the only cookie name Google Front End forwards through its CDN.
export const SESSION_COOKIE = "__session";

// Firebase allows up to 14 days; 5 keeps the revocation window tight.
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;
