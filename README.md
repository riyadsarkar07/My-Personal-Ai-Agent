# Nexus Agent

Multi-provider AI Agent Platform. Create an agent once and reuse it across websites, mobile apps, and internal tools through a versioned REST API with automatic model failover.

## Architecture

```
Browser / Mobile / Server
        |
        |  Authorization: Bearer uag_live_...
        v
 Next.js App Router  (Vercel)
  /dashboard          session cookie auth
  /api/v1/*           hashed API key auth
  /api/dashboard/*    dashboard session auth
        |
        +-- AI gateway (Gemini, OpenAI, Anthropic, Groq, OpenRouter)
        +-- Automatic failover + cooldowns
        +-- Rate limiter + Zod validation
        +-- Supabase Postgres (or in-memory fallback)
```

Project isolation is enforced at every read and write: API keys, agents, conversations, memories, and usage logs are scoped to `project_id`.

## Folder structure

```
app/
  api/v1/                 Public REST API
  api/dashboard/          Session-authenticated dashboard API
  api/auth/               Login / register / logout
  dashboard/              Admin UI
  login/ register/        Auth pages
components/               Shared UI
lib/
  ai/                     Gateway, adapters, failover, tools
  supabase/               Clients
  store.ts                Data access (Supabase + memory fallback)
  api-auth.ts             API key auth + rate limits
packages/agent-sdk/       Reusable TypeScript SDK
supabase/migrations/      Postgres schema + RLS
tests/                    Unit tests
```

## Quick start

1. Copy `.env.example` to `.env.local` and fill in at least one provider key plus (optionally) Supabase values.
2. `npm install`
3. `npm run dev`
4. Sign in with your Supabase Auth email and password (or, without Supabase, `ADMIN_EMAIL` / `ChangeMe123!`).
5. Create a project, generate a Nexus API key, and call `POST /api/v1/chat`.

Without Supabase credentials the platform runs on a process-local store so you can develop the API and dashboard immediately. Use Supabase for production.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript
- `npm test` — unit tests
- `npm run lint` — ESLint

## Docs

- INSTALLATION.md
- DEPLOYMENT.md
- API_DOCUMENTATION.md
- SDK_USAGE.md
- SECURITY.md
