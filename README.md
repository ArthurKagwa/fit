# Fit — personal fitness assistant & tracker

A mobile-first fitness tracker with an AI coach. Log weight, runs, workouts and
meals through quick forms **or by chatting** — snap a photo of your meal and AI
estimates the calories; upload a run screenshot and AI reads the distance and
pace. A dashboard visualises weight trend, weekly distance, pace, calories vs
target, streaks and goal progress, and the coach can build you a training plan
grounded in your real data.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind v4** — single full-stack app
- **Postgres + Prisma 7** (`pg` driver adapter, serverless-friendly)
- **Auth.js v5** credentials auth (multi-user, JWT sessions)
- **OpenRouter** for AI, as a cost-tiered model fleet:
  - `MODEL_EXTRACT` (default `google/gemini-2.5-flash`) — meal-photo calorie
    estimation, run-screenshot parsing, chat-image analysis
  - `MODEL_CHAT` (default `anthropic/claude-sonnet-4.5`) — the coach, with
    tool calling into the data layer
  - `MODEL_LIGHT` (default `google/gemini-2.5-flash-lite`) — weekly recaps
- **Vercel Blob** for photo storage (local `.uploads/` fallback in dev)

Images sent to chat are analyzed once on the cheap tier and passed to the chat
model as structured text — the expensive model never consumes image tokens.
Images are also compressed client-side (≤1280px JPEG) before upload.

## Local development

```bash
npm install

cp .env.example .env
# fill in:
#   DATABASE_URL       — any Postgres (local docker, Neon branch, ...)
#   AUTH_SECRET        — openssl rand -base64 32
#   OPENROUTER_API_KEY — optional; without it AI features hide gracefully
#   BLOB_READ_WRITE_TOKEN — optional; dev falls back to local .uploads/

npx prisma migrate dev     # create schema
npx prisma db seed         # demo user: demo@fit.local / Fit123!
npm run dev
```

Open http://localhost:3000 on a phone-sized viewport, sign in with the demo
user (or sign up), and try:

- **Log** → add weight / run / meal / workout; Meal and Run tabs have AI
  photo capture with an editable confirmation form
- **Coach** → "ran 5k in 26:10 yesterday", "weighed 82.4 this morning",
  "had chicken rice for lunch", "build me a 6-week 5k plan",
  "how am I doing this week?" — or attach a meal photo / run screenshot
- **Home** → charts, streak, goals, weekly summary (+ AI recap)
- **More** → history, progress photos (with side-by-side compare), goals, plan

## Deploying to Vercel

1. Create a **Postgres** database (Vercel Postgres / Neon) and a **Blob store**
   on the Vercel dashboard.
2. Import this repo into Vercel and set the environment variables:
   `DATABASE_URL` (pooled connection string), `AUTH_SECRET`,
   `OPENROUTER_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and optionally
   `MODEL_CHAT` / `MODEL_EXTRACT` / `MODEL_LIGHT` overrides.
3. Apply the schema to the production database from your machine:
   `DATABASE_URL=<prod-url> npx prisma migrate deploy`
4. Deploy. `prisma generate` runs automatically via the `postinstall` script.

## Architecture notes

- **`src/lib/data.ts`** is the single choke point for every write: the quick
  forms, the REST routes and the AI tools all call the same zod-validated
  functions, so entries stay consistent regardless of how they were logged.
- **`src/lib/stats.ts`** computes the aggregates used by the dashboard, the
  `get_stats` coach tool, and the coach's system prompt — advice is grounded
  in the same numbers you see on screen.
- **`src/app/api/chat/route.ts`** runs a manual tool loop (max 6 iterations)
  and returns `savedEntries` so the UI can toast what got logged.
- All data is scoped by `userId`; deletes/updates use `*Many({ id, userId })`
  so ownership is enforced atomically.
