import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb, requireUid } from "../firestore/client";
import { SETTINGS_DOC, settingsPath, userPath } from "../firestore/paths";
import { stripUndefined } from "../firestore/sanitize";
import type { SettingsDoc } from "../firestore/types";
import { normalizeOriginLanguage } from "../origin-language";
import { SESSION_SIZE, STUDY_ORDER_KEYS, type StudyOrder } from "../study-config";
import { updateDisplayName } from "../auth/client-actions";
import type { UserSettings } from "./types";

export async function getUserSettings(): Promise<UserSettings | null> {
  const uid = requireUid();
  const snapshot = await getDoc(doc(getDb(), `${settingsPath(uid)}/${SETTINGS_DOC}`));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as SettingsDoc;
  return {
    sessionSize: Math.max(
      SESSION_SIZE.min,
      Math.min(SESSION_SIZE.max, data.newPerDay ?? SESSION_SIZE.min)
    ),
    reminder: data.reminder ?? true,
    order: STUDY_ORDER_KEYS.includes(data.cardOrder as StudyOrder)
      ? (data.cardOrder as StudyOrder)
      : "sm2",
    showIpaFront: data.showIpaFront ?? true,
    showOriginBack: data.showOriginBack ?? true,
    originLanguage: normalizeOriginLanguage(data.originLanguage),
  };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const uid = requireUid();
  const originLanguage = normalizeOriginLanguage(settings.originLanguage);

  await setDoc(
    doc(getDb(), `${settingsPath(uid)}/${SETTINGS_DOC}`),
    stripUndefined({
      newPerDay: settings.sessionSize,
      reminder: settings.reminder,
      cardOrder: settings.order,
      showIpaFront: settings.showIpaFront,
      showOriginBack: settings.showOriginBack,
      originLanguage,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );

  await setDoc(
    doc(getDb(), userPath(uid)),
    stripUndefined({ originLanguage, updatedAt: new Date().toISOString() }),
    { merge: true }
  );
}

export async function saveDisplayName(displayName: string): Promise<string> {
  const name = await updateDisplayName(displayName);
  const uid = requireUid();
  await setDoc(
    doc(getDb(), userPath(uid)),
    stripUndefined({ displayName: name, updatedAt: new Date().toISOString() }),
    { merge: true }
  );
  return name;
}
