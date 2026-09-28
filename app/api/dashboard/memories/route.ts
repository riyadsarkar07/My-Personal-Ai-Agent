import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { memorySchema } from "@/lib/schemas";
import { listMemories, listProjectsForUser, upsertMemory } from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const agentId = url.searchParams.get("agentId");
  if (projectId) {
    await requireProjectAccess(auth.user.id, projectId);
    return jsonOk(await listMemories(projectId, agentId));
  }
  const projects = await listProjectsForUser(auth.user.id);
  const nested = await Promise.all(projects.map((p) => listMemories(p.id)));
  return jsonOk(nested.flat());
}

export async function POST(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const raw = await readJsonLimited<unknown>(request);
  const parsed = memorySchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid memory payload", 422);
  await requireProjectAccess(auth.user.id, parsed.data.projectId);
  const record = await upsertMemory({
    project_id: parsed.data.projectId,
    agent_id: parsed.data.agentId ?? null,
    key: parsed.data.key,
    content: parsed.data.content,
    metadata: parsed.data.metadata,
  });
  return jsonOk(record, 201);
}
