import { createAgentRecord, listAgents } from "@/lib/store";
import { createAgentSchema } from "@/lib/schemas";
import { getEnv } from "@/lib/env";
import { jsonOk } from "@/lib/utils";
import { parseBody, withApi } from "../_utils";

export async function OPTIONS(request: Request) {
  return withApi(request, "agents:read", async () => new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  return withApi(request, "agents:read", async (ctx) => {
    const agents = await listAgents(ctx.project.id);
    return jsonOk(agents);
  });
}

export async function POST(request: Request) {
  return withApi(request, "agents:write", async (ctx) => {
    const body = await parseBody(request, createAgentSchema);
    const agent = await createAgentRecord({
      project_id: ctx.project.id,
      name: body.name,
      description: body.description,
      model: body.model ?? getEnv().GEMINI_MODEL,
      system_instruction: body.systemInstruction,
      temperature: body.temperature,
      max_tokens: body.maxTokens,
      memory_enabled: body.memoryEnabled,
      tools_enabled: body.toolsEnabled,
      status: "active",
    });
    return jsonOk(agent, 201);
  });
}
