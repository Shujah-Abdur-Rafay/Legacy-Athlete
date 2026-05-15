# Limitless Athlete

Vite + React frontend with Firebase (Auth + Firestore + Cloud Functions) and Stripe.

## Run locally

Requires Node 18+.

```bash
npm install
cp .env.example .env   # fill in real values
npm run dev
```

The frontend talks to the backend at `VITE_FUNCTIONS_URL` (deployed Firebase Functions, or the emulator at `http://localhost:5001/<project-id>/us-central1`).

## Deploy to Vercel

The frontend deploys as a static Vite build. Backend stays on Firebase Functions — Vercel only serves the SPA.

1. Push the repo to GitHub.
2. In Vercel: **New Project** → import the repo. Framework is auto-detected as Vite.
3. Add the following **Environment Variables** (Production + Preview) under Project Settings → Environment Variables. Copy values from `.env.example`:

   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_PUBLIC_CALENDAR_ID`
   - `VITE_FUNCTIONS_URL`

4. Deploy. Build command (`npm run build`) and output dir (`dist`) are already set in [vercel.json](vercel.json).
5. Add the Vercel domain (e.g. `https://<project>.vercel.app` and any custom domain) to:
   - Firebase Auth → Authorized domains
   - The CORS allowlist in [functions/src/index.ts](functions/src/index.ts)
   - The Stripe webhook endpoint allowlist if applicable

## Backend secrets

Server-side secrets (Stripe secret, Resend, Google service account, etc.) are **not** part of the Vercel build. They live in Firebase Functions config:

```bash
firebase functions:config:set \
  stripe.secret_key="sk_..." \
  stripe.webhook_secret="whsec_..." \
  resend.api_key="re_..." \
  google.client_id="..." \
  google.client_secret="..." \
  app.base_url="https://your-domain.com"

firebase deploy --only functions
```
