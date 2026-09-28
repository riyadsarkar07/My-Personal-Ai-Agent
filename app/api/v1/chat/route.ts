import { resolveAgent, resolveConversation, runChat } from "@/lib/ai/chat";
import { chatRequestSchema } from "@/lib/schemas";
import { jsonOk } from "@/lib/utils";
import { parseBody, withApi } from "../_utils";

export async function OPTIONS(request: Request) {
  return withApi(request, "chat", async () => new Response(null, { status: 204 }));
}

export async function POST(request: Request) {
  return withApi(request, "chat", async (ctx) => {
    const body = await parseBody(request, chatRequestSchema);
    const agent = await resolveAgent(ctx.project, body.agentId);
    const conversation = await resolveConversation(ctx.project, agent, body.conversationId, body.message);
    const { result, assistant } = await runChat({
      project: ctx.project,
      agent,
      conversation,
      message: body.message,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      apiKeyId: ctx.apiKey.id,
      path: "/api/v1/chat",
    });
    return jsonOk({
      id: assistant.id,
      conversationId: conversation.id,
      agentId: agent.id,
      message: result.text,
      model: result.model,
      provider: result.provider ?? null,
      failover: result.failover ?? [],
      estimatedCostUsd: result.estimatedCostUsd ?? 0,
      costNote: "estimatedCostUsd is a catalog estimate, not provider billing.",
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      },
    });
  });
}
