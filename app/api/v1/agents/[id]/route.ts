import { deleteAgentRecord, getAgent, updateAgentRecord } from "@/lib/store";
import { updateAgentSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";
import { parseBody, withApi } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function OPTIONS(request: Request) {
  return withApi(request, "agents:read", async () => new Response(null, { status: 204 }));
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return withApi(request, "agents:read", async (ctx) => {
    const agent = await getAgent(id);
    if (!agent || agent.project_id !== ctx.project.id) return jsonError("Agent not found", 404);
    return jsonOk(agent);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return withApi(request, "agents:write", async (ctx) => {
    const agent = await getAgent(id);
    if (!agent || agent.project_id !== ctx.project.id) return jsonError("Agent not found", 404);
    const body = await parseBody(request, updateAgentSchema);
    const updated = await updateAgentRecord(id, {
      name: body.name,
      description: body.description,
      model: body.model,
      fallback_models: body.fallbackModels,
      system_instruction: body.systemInstruction,
      temperature: body.temperature,
      max_tokens: body.maxTokens,
      memory_enabled: body.memoryEnabled,
      tools_enabled: body.toolsEnabled,
    });
    return jsonOk(updated);
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return withApi(request, "agents:write", async (ctx) => {
    const agent = await getAgent(id);
    if (!agent || agent.project_id !== ctx.project.id) return jsonError("Agent not found", 404);
    await deleteAgentRecord(id);
    return jsonOk({ deleted: true });
  });
}
