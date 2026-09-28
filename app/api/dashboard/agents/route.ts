import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { getEnv } from "@/lib/env";
import { createAgentSchema } from "@/lib/schemas";
import { createAgentRecord, listAgents, listProjectsForUser } from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (projectId) {
    await requireProjectAccess(auth.user.id, projectId);
    return jsonOk(await listAgents(projectId));
  }
  const projects = await listProjectsForUser(auth.user.id);
  const nested = await Promise.all(projects.map((p) => listAgents(p.id)));
  return jsonOk(nested.flat());
}

export async function POST(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const raw = await readJsonLimited<unknown>(request);
  const parsed = createAgentSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid agent payload", 422);
  const projects = await listProjectsForUser(auth.user.id);
  const projectId = parsed.data.projectId || projects[0]?.id;
  if (!projectId) return jsonError("Create a project first", 400);
  await requireProjectAccess(auth.user.id, projectId);
  const agent = await createAgentRecord({
    project_id: projectId,
    name: parsed.data.name,
    description: parsed.data.description,
    model: parsed.data.model ?? getEnv().GEMINI_MODEL,
    fallback_models: parsed.data.fallbackModels ?? [],
    system_instruction: parsed.data.systemInstruction,
    temperature: parsed.data.temperature,
    max_tokens: parsed.data.maxTokens,
    memory_enabled: parsed.data.memoryEnabled,
    tools_enabled: parsed.data.toolsEnabled,
    status: "active",
  });
  return jsonOk(agent, 201);
}
