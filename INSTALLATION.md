# Installation

## Prerequisites

- Node.js 20+
- At least one provider API key (Gemini, OpenAI, Anthropic, Groq, or OpenRouter)
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
| GEMINI_API_KEY | One provider key is enough for live AI | Server-only |
| OPENAI_API_KEY | Optional | Server-only |
| ANTHROPIC_API_KEY | Optional | Server-only |
| GROQ_API_KEY | Optional | Server-only |
| OPENROUTER_API_KEY | Optional | Server-only |
| GEMINI_MODEL | No | Defaults to `gemini-2.0-flash` |
| NEXT_PUBLIC_SUPABASE_URL | Production | Public project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Production | Anon key, RLS enforced |
| SUPABASE_SERVICE_ROLE_KEY | Production | Server-only, never expose |
| APP_URL | Yes | Canonical origin |
| ADMIN_EMAIL | Yes | Email of the existing Supabase Auth user that should be owner |
| ADMIN_USER_ID | No | Supabase Auth UUID for that owner account |
| API_KEY_HASH_SECRET | Yes | HMAC secret for Nexus API keys |
| CREDENTIAL_ENCRYPTION_KEY | Recommended | AES-256-GCM for stored provider keys |
| SESSION_SECRET | No | Falls back to `API_KEY_HASH_SECRET` |

Never commit `.env.local`.

You can also add provider keys from the dashboard. Those credentials are encrypted at rest and never returned by the API.

## Providers

Supported adapters:

- Google Gemini
- OpenAI
- Anthropic Claude
- Groq
- OpenRouter

If no live key is present, chat still returns a configuration notice so the rest of the platform can be developed.

## Supabase

1. Create a project at supabase.com
2. Open SQL editor and run `supabase/migrations/0001_init.sql` then `supabase/migrations/0002_gateway.sql`
3. Copy URL, anon key, and service role key into `.env.local`
4. Restart the Next.js server

Row Level Security is enabled. The Next.js server uses the service role internally and never ships it to the browser. API key hashes and provider ciphertext are revoked from anon/authenticated roles.

## First admin

Set `ADMIN_EMAIL` to the address of the existing Supabase Auth user that should own the platform. Optionally set `ADMIN_USER_ID` to that user's Supabase Auth UUID.

On boot and at login the server:

- authenticates against Supabase Auth when it is configured
- creates or updates a `profiles` row for that Auth user
- promotes only the matching account to `owner`
- creates a default project and agent for that owner if none exist

Without Supabase credentials the local fallback still seeds `ADMIN_EMAIL` with password `ChangeMe123!` for development. Change it immediately.

Users cannot grant themselves the admin role from the dashboard.

## Verify

```bash
npm run typecheck
npm test
curl http://localhost:3000/api/v1/health
```
