# Security

## Secrets

- `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.
- `NEXT_PUBLIC_*` values are public by design and never include private keys.
- API keys are HMAC-SHA256 hashed with `API_KEY_HASH_SECRET` before storage.
- Raw keys are returned once at creation time.

## Authentication

- Public API: hashed API keys, status + expiry checks, permission scopes.
- Dashboard: signed HTTP-only JWT cookies (`jose` HS256).
- First-admin initialization uses `ADMIN_EMAIL`.

## Authorization

Every agent, conversation, key, and usage query is filtered by `project_id`. A valid key for project A cannot read project B.

## Input limits

- JSON bodies capped at 1 MB
- Zod schemas on every mutating route
- Chat messages capped at 32k characters

## Rate limits

Per API key: project `rate_limit_rpm` and `rate_limit_rpd`. Exceeded requests return 429.

## Tool calling

Only an allowlisted set of sandboxed tools may run (`calculator`, `current_time`, `json_extract`). Arbitrary code, shell, and network tools are rejected even if the model requests them.

## Prompt injection

System instructions always append a policy that forbids secret disclosure, instruction override, and unrestricted tool use. Tool results are treated as untrusted data.

## Logging

`redactSecrets` strips live API keys and bearer tokens from echoed content. Usage logs store error messages, not request secrets.

## CORS and headers

Middleware sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. API routes emit CORS headers based on the request origin.

## RLS

Supabase policies restrict member reads. `api_keys` and `audit_logs` are revoked from `anon` and `authenticated`.
