"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { readFirebaseWebConfig } from "./config";

// Browser Firebase app (singleton). Auth state lives in IndexedDB; the
// server-trusted session is a separate HttpOnly cookie minted by
// /api/auth/session, so an XSS cannot read the server session.

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const config = readFirebaseWebConfig();
  if (!config) throw new Error("firebase_not_configured");
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  auth.useDeviceLanguage();
  // Persist across reloads so a refresh does not bounce the user to /login
  // while the session cookie is still valid.
  void setPersistence(auth, browserLocalPersistence).catch(() => {});
  return auth;
}
