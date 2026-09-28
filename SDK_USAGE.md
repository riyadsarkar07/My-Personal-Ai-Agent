# SDK usage

The SDK lives in `packages/agent-sdk` and is intended for **server-side** runtimes only.

## Install (workspace)

```ts
import { UniversalAgent } from "@nexus/agent-sdk";
```

Copy the folder into your app or publish it to npm as `@yourname/agent-sdk`.

## Chat

```ts
const agent = new UniversalAgent({
  baseURL: "https://your-domain.vercel.app/api/v1",
  apiKey: process.env.AGENT_API_KEY!,
  timeoutMs: 20_000,
});

const response = await agent.chat({
  message: "Hello, how can you help me?",
});

console.log(response.message, response.model, response.provider);
```

Nexus selects the model and provider. The SDK always talks to `/api/v1` with a single Nexus API key.

## Streaming

```ts
await agent.stream(
  { message: "Summarize this repo" },
  {
    onDelta: (text) => process.stdout.write(text),
    onError: (message) => console.error(message),
  },
);
```

## Models, usage, memory

```ts
await agent.listModels();
await agent.usage();
await agent.upsertMemory({ key: "preferred_name", content: "Alex" });
await agent.listMemories({ q: "preferred" });
```

## Frontend applications

Never put `AGENT_API_KEY` in a browser bundle.

Use the included proxy pattern:

```ts
import { UniversalAgent } from "@nexus/agent-sdk";

const agent = new UniversalAgent({
  baseURL: process.env.NEXUS_API_URL!,
  apiKey: process.env.AGENT_API_KEY!,
});

export async function POST(request: Request) {
  const body = await request.json();
  const data = await agent.chat(body);
  return Response.json({ data });
}
```

The browser then calls your own `/api/proxy/chat` endpoint.

`UniversalAgent` throws if it is constructed in a browser environment.
