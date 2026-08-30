# TRUETRAINNEO

An AI-powered IELTS vocabulary app: AI word-context lookup, SM-2 flashcards, standard and AI-generated quizzes, tutor chat, speaking practice, IELTS Writing grading, and study streaks.

Built for Google Cloud Run with Firebase Authentication, Cloud Firestore, Gemini, and Secret Manager.

---

## Architecture

| Layer | Technology |
|---|---|
| Hosting | Google Cloud Run (`asia-east1`), containerized Next.js 14 standalone |
| Auth | Firebase Authentication — Google Sign-In + passwordless email link |
| Database | Cloud Firestore, strictly user-isolated |
| AI | Gemini via `@google/genai`, with an automated model fallback ladder |
| Secrets | Google Cloud Secret Manager + Application Default Credentials |

### Security model at a glance

- **Every document lives under `/users/{uid}/…`**, so one ownership predicate secures the entire tree.
- **The Gemini key never reaches the browser.** All model calls run in server route handlers; no `NEXT_PUBLIC_*` AI variable exists, and the build is verified against this.
- **No service-account JSON exists anywhere.** Firebase Admin uses Application Default Credentials; a startup guard hard-fails if key material is found in an environment variable.
- **The AI quota is server-only.** `firestore.rules` denies all client writes to `aiUsage`, so a user cannot reset their own counter.
- **Untrusted text is fenced.** Dictionary API responses, saved definitions and pasted essays are wrapped and labelled as data before reaching a prompt (OWASP LLM01).

### Request authorization

The browser holds a Firebase session; the server trusts an `HttpOnly` **session cookie** minted by the Admin SDK.

```
sign-in → ID token → POST /api/auth/session → Admin SDK verifies → __session cookie (HttpOnly, Secure, SameSite=Lax)
```

`middleware.ts` runs on the Edge runtime, where `firebase-admin` cannot run, so it only checks that the cookie is **present** and redirects obvious anonymous traffic. Real verification (`verifySessionCookie` with `checkRevoked`) happens on the Node runtime in `app/page.tsx` and in every API route. A forged cookie passes middleware and is rejected there.

---

## Deployment

Everything below assumes the [gcloud CLI](https://cloud.google.com/sdk/docs/install) and [Firebase CLI](https://firebase.google.com/docs/cli) are installed.

> **On Windows?** The commands in this section are bash. PowerShell needs different syntax in several places, two of which fail *silently*. Jump to **[Deploying from Windows](#deploying-from-windows)** for a complete PowerShell walkthrough.

### Step 1 — Project and APIs

```bash
export PROJECT_ID="your-project-id"
export REGION="asia-east1"
export SERVICE_NAME="truetrainneo"

gcloud auth login
gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  generativelanguage.googleapis.com
```

### Step 2 — Firebase Authentication

1. Open the [Firebase Console](https://console.firebase.google.com/) and add Firebase to the **same** GCP project.
2. **Build → Authentication → Get started**.
3. **Sign-in method** → enable:
   - **Google**
   - **Email/Password → Email link (passwordless sign-in)** — enable *only* the email-link toggle, leave Email/Password itself **disabled**.
4. **Settings → Authorized domains** → add `localhost` and your Cloud Run domain (available after Step 7; come back and add it).
5. **Project settings → General → Your apps → Web app** → register an app and copy the config values for Step 5.

> The app never handles or stores passwords. Federated and passwordless sign-in only.

### Step 3 — Firestore

```bash
gcloud firestore databases create --location="$REGION"
```

Deploy the rules and indexes from the repo root:

```bash
firebase login
firebase use "$PROJECT_ID"
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.rules` — owner-bound, with a server-only AI quota:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create, update: if isOwner(userId);

      match /decks/{deckId}      { allow read, write: if isOwner(userId); }
      match /words/{wordId}      { allow read, write: if isOwner(userId); }
      match /dailyStats/{dayId}  { allow read, write: if isOwner(userId); }
      match /settings/{docId}    { allow read, write: if isOwner(userId); }

      // Append-only history.
      match /reviewLogs/{logId} {
        allow read, create: if isOwner(userId);
        allow update, delete: if false;
      }

      // AI quota: readable by the owner, writable only by the Admin SDK.
      match /aiUsage/{usageId} {
        allow read: if isOwner(userId);
        allow write: if false;
      }
    }

    match /{document=**} { allow read, write: if false; }
  }
}
```

> The file in this repo is the authoritative version — it additionally type-checks each write. The block above is the same model in its shortest readable form.

Composite indexes ship in `firestore.indexes.json` and are created by the deploy above. Index builds take a few minutes; deck pagination and study sessions return errors until they finish.

### Step 4 — Secret Manager and IAM

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), then:

```bash
PROJECT_ID="$PROJECT_ID" GEMINI_API_KEY="your-key" ./scripts/setup-secrets.sh
```

Or run the equivalent manually:

```bash
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Create and populate the secret.
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
printf '%s' "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the Cloud Run runtime service account access to read the secret.
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"

# Firestore and Firebase Auth access for the same service account.
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user" --condition=None

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/firebaseauth.admin" --condition=None
```

> `printf` rather than `echo` — `echo` appends a newline that would be stored *inside* the secret.
>
> `secretAccessor` is granted **on the secret**, not project-wide.

### Step 5 — Local development (optional)

```bash
cp .env.local.example .env.local     # fill in the Firebase web config from Step 2
gcloud auth application-default login  # ADC for the Admin SDK
npm install
npm run dev
```

For local AI, set `GEMINI_API_KEY` in `.env.local`. In deployed environments the key comes from Secret Manager and this variable stays empty.

### Step 6 — Deploy to Cloud Run

```bash
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key" \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com" \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}" \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id"
```

`--allow-unauthenticated` refers to Cloud Run's own IAM layer. The app enforces its own Firebase authentication on every route; without this flag the sign-in page itself would be unreachable.

Firebase config is read at **runtime**, not baked in at build time — so changing projects needs only `--set-env-vars` and a new revision, never a rebuild.

### Step 7 — Register for challenge verification

```bash
gcloud run services update "$SERVICE_NAME" \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-east1
```

### Step 8 — Finish and verify

Add your Cloud Run URL to **Firebase Console → Authentication → Settings → Authorized domains**, or Google Sign-In will fail with `auth/unauthorized-domain`.

```bash
SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
curl -s "$SERVICE_URL/api/health"
```

Expected:

```json
{"ready":true,"checks":{"firebaseWebConfig":true,"firebaseAdminCredentials":true,"geminiKeyResolved":true,"geminiKeySource":"environment","geminiKeyLength":39}}
```

The probe returns booleans and a length only — never any part of a secret. If `ready` is `false`, the failing check names the step to revisit.

**`geminiKeySource` explained.** `--set-secrets` makes Cloud Run inject the secret's value as an ordinary environment variable, and the container cannot tell that apart from `--set-env-vars`. So:

| Value | Meaning |
|---|---|
| `environment` | The key was read from `process.env`. **This is the expected value for the deploy command above** — the key still lives in Secret Manager and never enters the image. |
| `secret-manager-api` | No env var was present, so the app called the Secret Manager API directly (rotation without redeploy). |
| `none` | No key resolved — AI features will report as unavailable. |

To confirm the key really is coming from Secret Manager rather than a plain env var:

```bash
gcloud run services describe "$SERVICE_NAME" --region "$REGION" \n  --format="yaml(spec.template.spec.containers[0].env)"
```

A `valueFrom.secretKeyRef` entry means Secret Manager; a bare `value:` means the key was pasted in as plaintext and should be moved.

---

## Deploying from Windows

A complete, self-contained walkthrough for Windows 10/11. You do **not** need WSL, and you do not need Docker — Cloud Build compiles the image in the cloud.

### Which shell

Either works, but pick one and stay in it:

| Shell | When to use |
|---|---|
| **PowerShell** | Recommended. Follow the numbered steps below. |
| **Git Bash** | If you prefer the bash commands from the section above, they run **as-is** in Git Bash. Only `./scripts/setup-secrets.sh` requires it. |

Do **not** paste the bash commands into PowerShell. `export`, `\` line continuations and `$(…)` command substitution behave differently or fail.

### Two Windows traps that fail silently

These are the ones that cost hours, because nothing reports an error:

**1. `curl` is not curl.** In Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`, which does not understand `-s` and returns an object rather than text. Always write **`curl.exe`** (present on every Windows 10/11 install), or use `Invoke-RestMethod`.

**2. Piping a secret corrupts it.** PowerShell adds a UTF-16 or UTF-8 byte-order mark and a trailing CRLF, and all of it is stored *inside* the secret. The Gemini key then fails authentication with a confusing error, and the secret *looks* fine in the Console. Measured on a 16-character key:

| How the key is written | Bytes stored | Damage |
|---|---|---|
| `$key \| Out-File f.txt` | **21** | BOM `ef bb bf` + CRLF |
| `Set-Content f.txt $key` | **18** | trailing CRLF |
| `Set-Content f.txt $key -Encoding utf8 -NoNewline` | **19** | BOM `ef bb bf` |
| `[System.IO.File]::WriteAllText(f, $key, utf8NoBom)` | **16** | correct |

`scripts\setup-secrets.ps1` uses the last form and prints the byte count so you can confirm it matches your key length.

### Syntax translation

| bash | PowerShell |
|---|---|
| `export FOO=bar` | `$FOO = "bar"` |
| `$FOO` | `$FOO` (same) |
| `\` at end of line | `` ` `` (backtick) |
| `$(command)` | `$(command)` (same) |
| `curl -s URL` | `curl.exe -s URL` |
| `./script.sh` | `.\script.ps1` |
| `printf '%s' "$K" \| gcloud … --data-file=-` | use `setup-secrets.ps1` (see trap 2) |

> Windows PowerShell 5.1 has no `&&`, no `||`, and no ternary operator. Run commands on separate lines.

### Step W1 — Install the tools

1. **Google Cloud CLI** — [download the installer](https://cloud.google.com/sdk/docs/install#windows). Accept "Run gcloud init" at the end.
2. **Node.js 20 or 22 LTS** — [nodejs.org](https://nodejs.org/).
3. **Firebase CLI** — `npm install -g firebase-tools`

Close and reopen PowerShell so `PATH` updates, then confirm:

```powershell
gcloud --version
node --version
firebase --version
```

If `gcloud` is not recognised after reinstalling, the installer did not update `PATH`. Add it manually:

```powershell
$env:PATH += ";$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"
```

### Step W2 — Allow the setup script to run

Windows blocks local scripts by default. This allows signed remote scripts and local ones, for the current user only:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

If you would rather not change the policy at all, run the script one time with a bypass instead:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-secrets.ps1 -ProjectId your-project-id
```

### Step W3 — Set your variables

```powershell
cd "$HOME\Desktop\true-train-neo-gcp"

$PROJECT_ID   = "your-project-id"
$REGION       = "asia-east1"
$SERVICE_NAME = "truetrainneo"

gcloud auth login
gcloud config set project $PROJECT_ID
```

These variables live only in the current window. If you close PowerShell, set them again.

### Step W4 — Firebase Console (browser)

Identical to **Step 2** above — it is all point-and-click:

1. [Firebase Console](https://console.firebase.google.com/) → add Firebase to the **same** GCP project.
2. **Authentication → Get started**.
3. **Sign-in method** → enable **Google**, and enable **Email/Password → Email link (passwordless)** with the Email/Password toggle itself left **off**.
4. **Project settings → General → Your apps → Web app** → register and copy the four config values.

Keep that config open — you need it in Step W7.

### Step W5 — Firestore

```powershell
gcloud firestore databases create --location=$REGION

firebase login
firebase use $PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

Index builds take a few minutes. Deck pagination and study sessions return errors until they finish — check progress in **Firebase Console → Firestore → Indexes**.

### Step W6 — Secrets and IAM

Get a key from [Google AI Studio](https://aistudio.google.com/apikey), then:

```powershell
.\scripts\setup-secrets.ps1 -ProjectId $PROJECT_ID -GeminiApiKey "YOUR_KEY_HERE"
```

The script enables the APIs, creates the secret, uploads the key with correct byte-for-byte encoding, and grants the runtime service account `secretAccessor` **on that secret only**, plus `datastore.user` and `firebaseauth.admin`.

Confirm the byte count it prints matches your key's length. If it does not, the key was mangled — re-run rather than deploying.

### Step W7 — Deploy

Backticks (`` ` ``) continue the line. Nothing may follow a backtick on the same line, not even a space.

```powershell
gcloud run deploy $SERVICE_NAME `
  --source . `
  --region $REGION `
  --allow-unauthenticated `
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" `
  --set-env-vars="NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key" `
  --set-env-vars="NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$PROJECT_ID.firebaseapp.com" `
  --set-env-vars="NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID" `
  --set-env-vars="NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id"
```

If backticks give you trouble, run it as one long line — it is the same command.

First deploy takes 5–10 minutes (Cloud Build installs dependencies and builds the image). Later deploys are faster.

> Uploads are governed by `.gcloudignore`, which excludes `node_modules` (**570 MB** in this project) and `.env`. **Do not delete that file** — this repo is not a git repository, so without it gcloud uploads the entire folder: a very slow deploy, and your Gemini key sent to Cloud Build.

### Step W8 — Label for challenge verification

```powershell
gcloud run services update $SERVICE_NAME `
  --update-labels=dev-tutorial=cloud-run-ai-challenge `
  --region=asia-east1
```

### Step W9 — Authorize the domain, then verify

```powershell
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
Write-Host $SERVICE_URL
```

Copy that URL (without `https://`) into **Firebase Console → Authentication → Settings → Authorized domains**. Skip this and Google Sign-In fails with `auth/unauthorized-domain`.

Then check readiness — note `curl.exe`, not `curl`:

```powershell
curl.exe -s "$SERVICE_URL/api/health"
```

Or, more idiomatically:

```powershell
Invoke-RestMethod "$SERVICE_URL/api/health" | ConvertTo-Json -Depth 5
```

Expect `ready: true` with `geminiKeySource: "environment"` — see the explanation under Step 8; that value is correct when the key is mounted with `--set-secrets`.

### Step W10 — Running locally on Windows (optional)

```powershell
Copy-Item .env.local.example .env
notepad .env                          # fill in the Firebase web config
gcloud auth application-default login  # ADC for the Admin SDK
npm install
npm run dev
```

Open <http://localhost:3000>. `localhost` is already an authorized domain in Firebase by default.

For local AI, add `GEMINI_API_KEY=your-key` to `.env`. Deployed environments read it from Secret Manager instead and leave this empty.

### Windows troubleshooting

| Symptom | Cause and fix |
|---|---|
| `gcloud : The term 'gcloud' is not recognized` | PowerShell opened before install finished. Close and reopen it, or add the SDK `bin` folder to `PATH` (Step W1). |
| `cannot be loaded because running scripts is disabled` | Execution policy. See Step W2. |
| `Invoke-WebRequest : A parameter cannot be found that matches parameter name 's'` | You used `curl` instead of `curl.exe`. |
| Gemini calls fail but the secret looks correct in the Console | The key was written with a BOM or trailing newline. Re-upload with `setup-secrets.ps1` and check the printed byte count. |
| Deploy uploads for many minutes, or fails on size | `.gcloudignore` is missing or was deleted. Restore it — 570 MB of `node_modules` is being uploaded. |
| `auth/unauthorized-domain` in the browser | The Cloud Run domain is not in Firebase authorized domains. Step W9. |
| `The query requires an index` | Index builds have not finished. Watch Firebase Console → Firestore → Indexes. |
| `PERMISSION_DENIED` on Firestore from the server | Runtime service account is missing `roles/datastore.user`. Re-run `setup-secrets.ps1`. |
| `ready: false`, `firebaseAdminCredentials: false` locally | ADC not set up. Run `gcloud auth application-default login`. |
| Backtick continuation errors | Trailing whitespace after a backtick. Put the whole command on one line instead. |
| `npm install` fails on a native module | Install the [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), or use Node 20/22 LTS rather than an odd-numbered release. |

---

## Gemini model resilience

Every model call goes through `generateContentWithFallback` (`lib/ai/gemini.ts`), which walks the ladder in order:

| Order | Model | Role |
|---|---|---|
| 1 | `gemini-3.6-flash` | Primary |
| 2 | `gemini-3.1-flash-lite` | High-availability fallback |
| 3 | `gemini-flash-latest` | Dynamic alias |
| 4 | `gemini-3.7-flash` | Deep reasoning fallback |

Recoverable statuses — `503 UNAVAILABLE`, `429 RESOURCE_EXHAUSTED`, `404 NOT_FOUND`, `500 INTERNAL` — advance to the next model. An empty response body (safety block or truncation) also advances. Authentication and permission failures deliberately do **not** retry: they fail identically on every model, so retrying only multiplies the latency of a certain failure. An error surfaces to the UI only after every model has been tried.

Gemini 3.6 Flash is natively multimodal, so IELTS Writing grading — which reads the task prompt out of an uploaded image — uses this same ladder rather than a separate vision path.

---

## Data model

```
users/{uid}                          profile: displayName, email, photoURL, originLanguage
  ├── decks/{deckId}                 name, description, category, color, icon
  ├── words/{wordId}                 deckId, word, wordLower, searchTokens[],
  │                                  phonetic, partOfSpeech, definition,
  │                                  definitionOrigin, example, synonyms[],
  │                                  ieltsBand, topicTags[], aiEnriched,
  │                                  sm2 { easeFactor, intervalDays, repetitions,
  │                                        dueDate, lastReviewed, totalReviews,
  │                                        correctStreak }
  ├── reviewLogs/{logId}             wordId, mode, rating, createdAt
  ├── dailyStats/{YYYY-MM-DD}        wordsReviewed, reviewCount, streakDay,
  │                                  practiceCompleted, practiceMode
  ├── settings/preferences           newPerDay, reminder, cardOrder, showIpaFront,
  │                                  showOriginBack, originLanguage
  └── aiUsage/{YYYY-MM-DD_kind}      kind, count          ← server-write only
```

Three design decisions worth knowing:

1. **SM-2 state is embedded on the word document.** The previous schema kept it in a separate table joined on every read; since the relation was always 1:1 within one owner, embedding it removes the join entirely.
2. **A new word is created already due** (`dueDate = today`, `repetitions = 0`), so "never reviewed **or** due" collapses into a single indexable `dueDate <= today` predicate.
3. **`dailyStats` carries a `reviewCount`** incremented in the same batch as each review, so the streak and heatmap read at most 126 small documents instead of the entire review log.

Queries needing `offset()`, aggregation or bulk deletes run server-side through the Admin SDK (`/api/decks/stats`, `/api/decks/words`, `/api/study/session`, `/api/decks/delete`). Everything else goes directly to Firestore from the client, where `firestore.rules` is the live enforcement path.

---

## Functional walkthrough tests

Every user-triggerable interaction, grouped by feature. Each is written so a coding tool can turn it into a script.

### 1. Authentication

| # | Steps | Expected |
|---|---|---|
| 1.1 | Open `/` signed out | Redirects to `/login` |
| 1.2 | Click "Continue with Google", pick an account | Popup closes, lands on `/`, dashboard renders |
| 1.3 | Block popups, click "Continue with Google" | Falls back to full-page redirect, returns signed in |
| 1.4 | Enter an email, submit "send sign-in link" | "Sign-in email sent" panel showing that address |
| 1.5 | Open the emailed link in the same browser | `/auth/callback` → "Signing you in…" → `/` |
| 1.6 | Open the emailed link in a different browser | "Confirm your email" prompt, then signs in |
| 1.7 | Reuse a consumed sign-in link | English error + "back to sign in"; no crash |
| 1.8 | Visit `/login` while signed in | Redirects to `/` |
| 1.9 | Settings → "sign out" | Lands on `/login`; Back does not restore the app |
| 1.10 | Replay the old cookie after signing out | Redirects to `/login`; no redirect loop |
| 1.11 | Set `__session` to garbage, open `/` | Redirects to `/login` |
| 1.12 | Open `/auth/callback?next=//evil.com` | Redirects to `/`, never off-origin |
| 1.13 | Inspect the UI and network for password fields | None exist |

### 2. Decks

| # | Steps | Expected |
|---|---|---|
| 2.1 | Decks → "new deck", enter a name, create | Deck appears in the list |
| 2.2 | Create a deck with an empty name | Rejected; no document written |
| 2.3 | Open a deck | Detail view with total / learned / due counts |
| 2.4 | Toggle deck category Academic ↔ General | Persists across reload |
| 2.5 | Delete a deck with words, confirm | Deck and all its words disappear; counts update |
| 2.6 | Sign in as another user | None of the first user's decks are visible |

### 3. Adding words

| # | Steps | Expected |
|---|---|---|
| 3.1 | Add word → type an English word → "fill" | Dictionary fields populate |
| 3.2 | Switch to AI mode → describe a meaning → "fill with AI" | Candidate list appears; picking one populates the fields |
| 3.3 | Enter a misspelling → fill | Suggestion offered with "use … & refill" |
| 3.4 | Save with no word entered | "Enter a word before saving."; nothing written |
| 3.5 | Save the same word + part of speech + definition twice | Duplicate warning naming the existing deck |
| 3.6 | Save a valid word | Toast confirms; word appears in the deck |
| 3.7 | Save with the network disabled | Error banner shown; **the form keeps your input** |
| 3.8 | Edit a word, change deck, update | Word moves; the old deck's count decreases |
| 3.9 | Delete a word, confirm | Row disappears; total decreases |
| 3.10 | Exceed the daily AI lookup limit | Quota message; standard lookup still works |

### 4. Vocabulary list

| # | Steps | Expected |
|---|---|---|
| 4.1 | Open a deck with more than one page of words | Pagination renders; page 2 loads |
| 4.2 | Filter by new / learning / learned | Only matching words listed; total updates |
| 4.3 | Search a whole word | Matching words returned |
| 4.4 | Search a prefix ("sust") | Matches "sustainable" |
| 4.5 | Search with a filter active | Both constraints applied together |
| 4.6 | Search something with no matches | Empty state, no error |

### 5. Flashcards (SM-2)

| # | Steps | Expected |
|---|---|---|
| 5.1 | Practice → pick a deck | Session starts with due cards |
| 5.2 | Press space | Card flips to the back |
| 5.3 | Rate again / hard / good / easy (or keys 1–4) | Next card; rating recorded |
| 5.4 | Finish a session | "Session complete!" with the reviewed count |
| 5.5 | Reopen the same deck immediately | Rated cards are no longer due |
| 5.6 | Rate with the network disabled | Error toast; progress not silently lost |
| 5.7 | Study a deck with nothing due | "No new or due cards left" + choose-another-deck |
| 5.8 | Switch flashcard order (SM-2 / alphabetical / random) | Card order changes accordingly |

### 6. Standard quiz

| # | Steps | Expected |
|---|---|---|
| 6.1 | Start a quiz on a deck with ≥4 words | Four options render |
| 6.2 | Answer with A–D or 1–4 | Correct/incorrect feedback shown |
| 6.3 | Press enter | Advances to the next question |
| 6.4 | Complete the quiz | Results screen with the score |
| 6.5 | Quiz a deck with fewer than 4 words | Clear "not enough words" message |

### 7. AI quiz

| # | Steps | Expected |
|---|---|---|
| 7.1 | Open "generate with AI" | Config modal shows remaining daily credits |
| 7.2 | Choose a question count and generate | Questions arrive using deck words |
| 7.3 | Deselect all but one question type | At least one type stays selected |
| 7.4 | Verify question labels | Every label is one you selected |
| 7.5 | Exhaust the daily quiz quota | Quota message; standard quiz still available |
| 7.6 | Generate with no Gemini key configured | Falls back to the local generator, marked "simulated" |

### 8. Chat

| # | Steps | Expected |
|---|---|---|
| 8.1 | Send an English sentence | AI reply within a few seconds |
| 8.2 | Check highlighted words | `[bracketed]` words render highlighted |
| 8.3 | Send with the network disabled | Error banner; **input preserved**; button reads "retry" |
| 8.4 | Press retry once the network returns | Message sends; input clears only then |
| 8.5 | Exhaust the daily chat quota | Quota message in the transcript |

### 9. Speaking practice

| # | Steps | Expected |
|---|---|---|
| 9.1 | Open speaking practice, tap the mic | Status: "Listening…" |
| 9.2 | Speak a short English sentence | Transcript appears; AI replies |
| 9.3 | Deny microphone permission | "Microphone access is required…" |
| 9.4 | Open in a browser without speech recognition | "Try Chrome or Edge" |
| 9.5 | Exhaust the daily speaking quota | Quota message |

### 10. IELTS Writing

| # | Steps | Expected |
|---|---|---|
| 10.1 | Upload a task image (PNG/JPG) | Preview renders |
| 10.2 | Upload a non-image file | "Please choose an image file." |
| 10.3 | Upload an image over 8 MB | "Image is too large (8MB maximum)." |
| 10.4 | Submit with fewer than 20 words | "answer too short"; no AI call |
| 10.5 | Submit a valid answer | Band scores per criterion, corrections, model rewrite |
| 10.6 | Submit an off-topic answer | `offTopic` flagged; bands capped |
| 10.7 | Exhaust the daily grading quota | Quota message |

### 11. Streaks and stats

| # | Steps | Expected |
|---|---|---|
| 11.1 | Complete the first session of the day | Streak modal appears; streak increments |
| 11.2 | Complete a second session the same day | No second increment |
| 11.3 | Open Stats | Totals, accuracy, per-deck breakdown |
| 11.4 | Check the heatmap | Today's cell reflects today's reviews |
| 11.5 | Hover a heatmap cell | Tooltip shows the date and review count |

### 12. Settings

| # | Steps | Expected |
|---|---|---|
| 12.1 | Change session size with −/+ | Persists across reload |
| 12.2 | Toggle reminder / phonetics / meaning-on-flip | Each persists |
| 12.3 | Change flashcard order | Persists; next session uses it |
| 12.4 | Change **Your language** | Persists; AI explanations arrive in that language |
| 12.5 | Change display name and save | Name updates without error |
| 12.6 | Switch theme light ↔ dark | Applies immediately and persists |

### 13. Deployment and security

| # | Steps | Expected |
|---|---|---|
| 13.1 | `curl $SERVICE_URL/api/health` | `ready: true`, all checks pass |
| 13.2 | Search the client bundle for the Gemini key | Zero occurrences |
| 13.3 | Call any `/api/ai/*` route without a session | `401 unauthorized` |
| 13.4 | Write to another user's Firestore path from the browser | Permission denied |
| 13.5 | Write to your own `aiUsage` document from the browser | Permission denied |
| 13.6 | Update a `reviewLogs` document from the browser | Permission denied |
| 13.7 | Set `FIREBASE_PRIVATE_KEY` and restart | Startup guard fails with an explanatory message |

---

## Project layout

```
app/
  api/ai/{chat,enrich,quiz,speaking,writing}   Gemini routes (authenticated)
  api/auth/session                             session cookie mint / revoke
  api/decks/{stats,words,delete}               Admin SDK data routes
  api/study/session                            due-card selection
  api/health                                   deployment readiness probe
  auth/callback                                email-link sign-in handler
  login                                        Google + passwordless sign-in
lib/
  ai/          gemini.ts (fallback ladder), secrets.ts, usage.ts, context.ts, prompts
  auth/        client actions, redirect guard
  firebase/    client, admin (ADC), session cookies, runtime config
  firestore/   types, paths, sanitizer, search tokens
  queries/     vocabulary, review, settings
firestore.rules / firestore.indexes.json
Dockerfile / .dockerignore / .gcloudignore
scripts/
  setup-secrets.sh                             secrets + IAM (bash)
  setup-secrets.ps1                            secrets + IAM (Windows PowerShell)
```

> `.gcloudignore` keeps `node_modules` (570 MB) and `.env` out of the Cloud Build upload. It is required rather than optional here, because gcloud only falls back to `.gitignore` inside a git repository and this project is not one.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build (standalone output) |
| `npm start` | Serve the production build |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | Next.js lint |

## Known issues

`npm audit` reports advisories in `firebase-admin → @google-cloud/storage → teeny-request → gaxios`. That is the Cloud Storage transitive path, which this application never imports. `npm audit fix --force` downgrades `firebase-admin` below the version whose session-cookie API this app depends on, so these are knowingly left in place and tracked for the upstream fix.
