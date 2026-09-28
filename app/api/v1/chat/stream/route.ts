import { resolveAgent, resolveConversation, runChatStream } from "@/lib/ai/chat";
import { authenticateApiRequest, corsHeaders } from "@/lib/api-auth";
import { chatRequestSchema } from "@/lib/schemas";
import { readJsonLimited } from "@/lib/utils";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, []) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request, []);
  const auth = await authenticateApiRequest(request, "chat");
  if ("response" in auth) {
    const body = await auth.response.text();
    return new Response(body, {
      status: auth.response.status,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }
  const raw = await readJsonLimited<unknown>(request);
  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: { message: "Invalid request", status: 422 } }, { status: 422, headers });
  }
  const body = parsed.data;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const agent = await resolveAgent(auth.ctx.project, body.agentId);
        const conversation = await resolveConversation(auth.ctx.project, agent, body.conversationId, body.message);
        send("meta", { conversationId: conversation.id, agentId: agent.id });
        const result = await runChatStream({
          project: auth.ctx.project,
          agent,
          conversation,
          message: body.message,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          apiKeyId: auth.ctx.apiKey.id,
          path: "/api/v1/chat/stream",
          onChunk: (text) => send("delta", { text }),
        });
        send("done", {
          conversationId: conversation.id,
          message: result.text,
          usage: { promptTokens: result.promptTokens, completionTokens: result.completionTokens },
        });
      } catch (error) {
        send("error", { message: error instanceof Error ? error.message : "Stream failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...headers,
    },
  });
}
