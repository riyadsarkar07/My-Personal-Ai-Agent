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

```json
{
  "message": "Hello, how can you help me?",
  "agentId": "agt_...",
  "conversationId": "cnv_...",
  "temperature": 0.4,
  "maxTokens": 1024
}
```

Permission: `chat`

## POST /chat/stream

Same body as `/chat`. Server-Sent Events:

- `event: meta` — conversation and agent ids
- `event: delta` — `{ "text": "..." }`
- `event: done` — final message and usage
- `event: error` — failure

## GET /agents

List agents in the API key's project.

## POST /agents

Create an agent. Permission: `agents:write`

## GET /agents/:id

## PATCH /agents/:id

## DELETE /agents/:id

## GET /conversations

Add `?include=messages` to embed messages.

## GET /conversations/:id

## DELETE /conversations/:id

Permission: `conversations:write`

## GET /usage

Aggregated totals plus recent logs. Permission: `usage:read`

## GET /health

Unauthenticated liveness payload.

## Isolation

An API key can only read and write rows whose `project_id` matches the key. Cross-project agent, conversation, and usage access returns 404.

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
| 503 | Gemini not configured |
| 504 | Upstream timeout |
