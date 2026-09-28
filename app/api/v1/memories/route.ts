import { listMemories, retrieveMemories, upsertMemory } from "@/lib/store";
import { memorySchema } from "@/lib/schemas";
import { jsonOk } from "@/lib/utils";
import { parseBody, withApi } from "../_utils";

export async function OPTIONS(request: Request) {
  return withApi(request, "agents:read", async () => new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  return withApi(request, "agents:read", async (ctx) => {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId");
    const q = url.searchParams.get("q");
    if (q) return jsonOk(await retrieveMemories(ctx.project.id, agentId, q));
    return jsonOk(await listMemories(ctx.project.id, agentId));
  });
}

export async function POST(request: Request) {
  return withApi(request, "agents:write", async (ctx) => {
    const body = await parseBody(request, memorySchema.omit({ projectId: true }));
    const record = await upsertMemory({
      project_id: ctx.project.id,
      agent_id: body.agentId ?? null,
      key: body.key,
      content: body.content,
      metadata: body.metadata,
    });
    return jsonOk(record, 201);
  });
}
