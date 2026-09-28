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

console.log(response.message);
```

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

## Frontend applications

Never put `AGENT_API_KEY` in a browser bundle.

Use the included proxy pattern:

```ts
// app/api/proxy/chat/route.ts on YOUR website
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
