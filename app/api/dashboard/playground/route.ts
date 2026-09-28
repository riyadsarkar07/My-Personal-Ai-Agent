import { resolveConversation, runChat } from "@/lib/ai/chat";
import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { playgroundChatSchema } from "@/lib/schemas";
import { getAgent, getProject } from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

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
  const conversation = await resolveConversation(
    project,
    agent,
    parsed.data.conversationId,
    parsed.data.message,
  );
  const { result, assistant } = await runChat({
    project,
    agent,
    conversation,
    message: parsed.data.message,
    temperature: parsed.data.temperature,
    maxTokens: parsed.data.maxTokens,
    apiKeyId: null,
    path: "/api/dashboard/playground",
  });
  return jsonOk({
    id: assistant.id,
    conversationId: conversation.id,
    agentId: agent.id,
    message: result.text,
    model: result.model,
    provider: result.provider ?? null,
    estimatedCostUsd: result.estimatedCostUsd ?? 0,
    usage: {
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    },
  });
}
