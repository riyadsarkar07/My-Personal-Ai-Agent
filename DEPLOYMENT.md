# Deployment (GitHub + Vercel)

This document describes how to deploy Nexus Agent. It does not claim that production verification has been completed.

## 1. Push to GitHub

```bash
git add .
git commit -m "feat: implement multi-provider AI gateway and automatic failover"
git push -u origin main
```

Do not commit `.env`, `.env.local`, or real secrets.

## 2. Create the Vercel project

1. Import the GitHub repository in Vercel.
2. Framework preset: Next.js.
3. Set environment variables from `.env.example`.
4. Deploy.

`APP_URL` must be the production origin, for example `https://your-app.vercel.app`.

Required for a usable production chat endpoint:

- at least one of `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`
- `API_KEY_HASH_SECRET`
- `ADMIN_EMAIL` (the existing Supabase Auth user that should be owner)
- `APP_URL`

Recommended:

- Supabase trio (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- `CREDENTIAL_ENCRYPTION_KEY`
- `SESSION_SECRET`

## 3. Supabase

Apply both migrations before the first production request that needs persistence:

- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_gateway.sql`

Confirm:

- RLS is enabled on every table
- `service_role` is only used by the Next.js server
- anon clients cannot `SELECT` from `api_keys` or `provider_credentials`

## 4. Post-deploy checks

```bash
curl https://your-app.vercel.app/api/v1/health
```

Then from the dashboard:

1. Sign in with the Supabase Auth account matching `ADMIN_EMAIL`
2. Add provider keys under Providers (or rely on env vars)
3. Create a project
4. Generate a Nexus API key (copy it once)
5. Call chat:

```bash
curl -X POST https://your-app.vercel.app/api/v1/chat \
  -H "Authorization: Bearer uag_live_..." \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

## 5. Custom domain

Attach a domain in Vercel and update `APP_URL`. CORS uses the request Origin when the project has no explicit allowlist.

## 6. Rollback

Vercel keeps immutable deployments. Redeploy a previous Git SHA from the dashboard if a release fails health checks.
