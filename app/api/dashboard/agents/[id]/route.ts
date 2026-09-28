import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { updateAgentSchema } from "@/lib/schemas";
import { deleteAgentRecord, getAgent, updateAgentRecord } from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const agent = await getAgent(id);
  if (!agent) return jsonError("Agent not found", 404);
  await requireProjectAccess(auth.user.id, agent.project_id);
  const raw = await readJsonLimited<unknown>(request);
  const parsed = updateAgentSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid agent payload", 422);
  const updated = await updateAgentRecord(id, {
    name: parsed.data.name,
    description: parsed.data.description,
    model: parsed.data.model,
    fallback_models: parsed.data.fallbackModels,
    system_instruction: parsed.data.systemInstruction,
    temperature: parsed.data.temperature,
    max_tokens: parsed.data.maxTokens,
    memory_enabled: parsed.data.memoryEnabled,
    tools_enabled: parsed.data.toolsEnabled,
  });
  return jsonOk(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const agent = await getAgent(id);
  if (!agent) return jsonError("Agent not found", 404);
  await requireProjectAccess(auth.user.id, agent.project_id);
  await deleteAgentRecord(id);
  return jsonOk({ deleted: true });
}
