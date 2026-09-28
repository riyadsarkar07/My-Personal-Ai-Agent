# Deployment (GitHub + Vercel)

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "feat: nexus agent platform"
git remote add origin git@github.com:<you>/nexus-agent.git
git push -u origin main
```

Do not commit `.env`, `.env.local`, or real secrets.

## 2. Create the Vercel project

1. Import the GitHub repository in Vercel.
2. Framework preset: Next.js.
3. Set environment variables from `.env.example`.
4. Deploy.

`APP_URL` must be the production origin, for example `https://your-app.vercel.app`.

## 3. Supabase

Apply `supabase/migrations/0001_init.sql` before the first production request that needs persistence. Confirm:

- RLS is enabled on every table
- `service_role` is only used by the Next.js server
- anon clients cannot `SELECT` from `api_keys`

## 4. Post-deploy checks

```bash
curl https://your-app.vercel.app/api/v1/health
```

Then from the dashboard:

1. Sign in as `ADMIN_EMAIL`
2. Create a project
3. Generate an API key (copy it once)
4. Call chat:

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
