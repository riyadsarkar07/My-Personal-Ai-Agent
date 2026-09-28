export default function DocsPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Documentation</h1>
      <p className="text-muted">
        Authenticate every public request with <code className="font-mono text-secondary">Authorization: Bearer uag_live_...</code>
      </p>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium">Chat</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-4 text-sm">{`POST /api/v1/chat
{
  "message": "Hello",
  "agentId": "agt_...",
  "conversationId": "cnv_..."
}`}</pre>
      </section>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium">SDK</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-4 text-sm">{`import { UniversalAgent } from "@nexus/agent-sdk";

const agent = new UniversalAgent({
  baseURL: "https://your-domain.vercel.app/api/v1",
  apiKey: process.env.AGENT_API_KEY!,
});

const response = await agent.chat({ message: "Hello" });`}</pre>
      </section>
      <p className="text-sm text-muted">
        Full references: API_DOCUMENTATION.md, SDK_USAGE.md, SECURITY.md, DEPLOYMENT.md.
      </p>
    </article>
  );
}
