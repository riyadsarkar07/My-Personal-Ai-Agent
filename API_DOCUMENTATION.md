# API Documentation

Base path: `/api/v1`

Authenticate with either:

```
Authorization: Bearer uag_live_<secret>
```

or

```
X-API-Key: uag_live_<secret>
```

All JSON responses are envelopes:

```json
{ "data": { } }
```

Errors:

```json
{ "error": { "message": "Invalid API key", "status": 401 } }
```

Rate-limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## POST /chat

Send a message. Creates a conversation when `conversationId` is omitted.

The platform selects the agent's primary model, then automatically fails over to `fallbackModels` (or catalog backups) on rate limits, quota exhaustion, timeouts, and recoverable provider errors.

```json
{
  "message": "Hello, how can you help me?",
  "agentId": "agt_...",
  "conversationId": "cnv_...",
  "temperature": 0.4,
  "maxTokens": 1024
}
```

Response extras:

- `provider` — provider that produced the reply
- `failover` — attempt log for this request
- `estimatedCostUsd` — catalog estimate only, not actual billing

Permission: `chat`

## POST /chat/stream

Same body as `/chat`. Server-Sent Events:

- `event: meta` — conversation and agent ids
- `event: delta` — `{ "text": "..." }`
- `event: done` — final message, usage, model, provider
- `event: error` — failure

If streaming has already emitted tokens, the gateway does not retry another model for that request.

## GET /agents

List agents in the API key's project.

## POST /agents

Create an agent. Permission: `agents:write`

`model` may be any catalog id (`gemini-2.0-flash`, `gpt-4o-mini`, `claude-3-5-haiku-20241022`, ...). Optional `fallbackModels` is an ordered backup list.

## GET /agents/:id

## PATCH /agents/:id

## DELETE /agents/:id

## GET /conversations

Add `?include=messages` to embed messages.

## GET /conversations/:id

## DELETE /conversations/:id

Permission: `conversations:write`

## GET /usage

Aggregated totals plus recent logs. `estimatedCostUsd` is a catalog estimate. Permission: `usage:read`

## GET /models

Catalog of supported provider models and estimated pricing. Permission: `agents:read`

## GET /memories

List project-scoped memories. Query `agentId` and `q` to filter. Permission: `agents:read`

## POST /memories

Upsert a memory. Permission: `agents:write`

```json
{ "key": "preferred_name", "content": "Alex", "agentId": "agt_..." }
```

## DELETE /memories/:id

Permission: `agents:write`

## GET /health

Unauthenticated liveness payload, including which provider env keys are present.

## Isolation

An API key can only read and write rows whose `project_id` matches the key. Cross-project agent, conversation, memory, and usage access returns 404.

## Status codes

| Code | Meaning |
| --- | --- |
| 200/201 | Success |
| 401 | Missing, invalid, or revoked key |
| 403 | Permission or inactive project |
| 404 | Resource not in this project |
| 413 | Body too large |
| 422 | Validation |
| 429 | Rate limited |
| 503 | No eligible provider configured |
| 504 | Upstream timeout |
