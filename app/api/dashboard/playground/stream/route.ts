import { resolveConversation, runChatStream } from "@/lib/ai/chat";
import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { playgroundChatSchema } from "@/lib/schemas";
import { getAgent, getProject } from "@/lib/store";
import { jsonError, readJsonLimited } from "@/lib/utils";

export async function POST(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const raw = await readJsonLimited<unknown>(request);
  const parsed = playgroundChatSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid playground payload", 422);
  const agent = await getAgent(parsed.data.agentId);
  if (!agent) return jsonError("Agent not found", 404);
  await requireProjectAccess(auth.user.id, agent.project_id);
  const project = await getProject(agent.project_id);
  if (!project) return jsonError("Project not found", 404);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const conversation = await resolveConversation(
          project,
          agent,
          parsed.data.conversationId,
          parsed.data.message,
        );
        send("meta", { conversationId: conversation.id, agentId: agent.id });
        const result = await runChatStream({
          project,
          agent,
          conversation,
          message: parsed.data.message,
          temperature: parsed.data.temperature,
          maxTokens: parsed.data.maxTokens,
          apiKeyId: null,
          path: "/api/dashboard/playground/stream",
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
    },
  });
}
