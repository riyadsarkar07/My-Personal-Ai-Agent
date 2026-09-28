# Installation

## Prerequisites

- Node.js 20+
- A Google Gemini API key
- (Production) a Supabase project
- (Production) a Vercel account and GitHub repository

## Local setup

```bash
git clone <your-repo>
cd nexus-agent-platform
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| GEMINI_API_KEY | Yes for live AI | Server-only |
| GEMINI_MODEL | No | Defaults to `gemini-2.0-flash` |
| NEXT_PUBLIC_SUPABASE_URL | Production | Public project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Production | Anon key, RLS enforced |
| SUPABASE_SERVICE_ROLE_KEY | Production | Server-only, never expose |
| APP_URL | Yes | Canonical origin |
| ADMIN_EMAIL | Yes | First owner account |
| API_KEY_HASH_SECRET | Yes | HMAC secret for API keys |

Never commit `.env.local`.

## Gemini

1. Create an API key in Google AI Studio.
2. Set `GEMINI_API_KEY` on the server.
3. Choose a model in the dashboard or via `GEMINI_MODEL`.

If the key is missing, chat endpoints still run and return a configuration notice so the rest of the platform can be developed.

## Supabase

1. Create a project at supabase.com
2. Open SQL editor and run `supabase/migrations/0001_init.sql`
3. Copy URL, anon key, and service role key into `.env.local`
4. Restart the Next.js server

Row Level Security is enabled. The Next.js server uses the service role internally and never ships it to the browser. API key hashes are revoked from anon/authenticated roles.

## First admin

On first boot the platform seeds:

- a profile for `ADMIN_EMAIL`
- password `ChangeMe123!`
- a default project
- a general-purpose agent

Sign in at `/login`, then change the password in your identity process before production.

## Verify

```bash
npm run typecheck
npm test
curl http://localhost:3000/api/v1/health
```
