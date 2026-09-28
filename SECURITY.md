# Security

## Secrets

- Provider keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`) and `SUPABASE_SERVICE_ROLE_KEY` are server-only.
- Dashboard-stored provider credentials are encrypted with AES-256-GCM using `CREDENTIAL_ENCRYPTION_KEY` (falls back to `API_KEY_HASH_SECRET`).
- APIs never return ciphertext or raw provider keys. Only `key_prefix` is shown.
- `NEXT_PUBLIC_*` values are public by design and never include private keys.
- Nexus API keys are HMAC-SHA256 hashed with `API_KEY_HASH_SECRET` before storage.
- Raw Nexus keys are returned once at creation time.

## Authentication

- Public API: hashed API keys, status + expiry checks, permission scopes.
- Dashboard: signed HTTP-only JWT cookies (`jose` HS256).
- When Supabase is configured, login and signup verify credentials with Supabase Auth, then sync a `profiles` row.
- First-admin initialization uses server-only `ADMIN_EMAIL` / `ADMIN_USER_ID`. The matching Auth user is promoted to `owner`; other users stay `member`.

## Authorization

Every agent, conversation, key, memory, and usage query is filtered by `project_id`. A valid key for project A cannot read project B.

## Input limits

- JSON bodies capped at 1 MB
- Zod schemas on every mutating route
- Chat messages capped at 32k characters

## Rate limits

Per Nexus API key: project `rate_limit_rpm` and `rate_limit_rpd`. Exceeded requests return 429. Provider rate limits trigger bounded failover, not infinite retries.

## Failover

Retryable classes: rate limit, quota, timeout, network, 5xx. Auth and invalid-request errors do not retry the same model indefinitely. After stream tokens are emitted, another model is not attempted for that request.

## Tool calling

Only an allowlisted set of sandboxed tools may run (`calculator`, `current_time`, `json_extract`). Arbitrary code, shell, and network tools are rejected even if the model requests them.

## Prompt injection

System instructions always append a policy that forbids secret disclosure, instruction override, and unrestricted tool use. Tool results and stored memories are treated as untrusted data.

## Logging

`redactSecrets` strips live API keys and bearer tokens from echoed content. Usage and failover logs store error messages, not request secrets.

## CORS and headers

Middleware sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. API routes emit CORS headers based on the request origin.

## RLS

Supabase policies restrict member reads. `api_keys`, `audit_logs`, `provider_credentials`, and `failover_logs` are revoked from `anon` and `authenticated`.
