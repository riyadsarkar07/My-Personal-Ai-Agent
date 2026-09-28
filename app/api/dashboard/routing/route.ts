import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { routingPolicySchema } from "@/lib/schemas";
import { createRoutingPolicy, listRoutingPolicies } from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (projectId) await requireProjectAccess(auth.user.id, projectId);
  return jsonOk(await listRoutingPolicies(projectId || undefined));
}

export async function POST(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const raw = await readJsonLimited<unknown>(request);
  const parsed = routingPolicySchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid routing payload", 422);
  if (parsed.data.projectId) await requireProjectAccess(auth.user.id, parsed.data.projectId);
  const policy = await createRoutingPolicy({
    project_id: parsed.data.projectId ?? null,
    name: parsed.data.name,
    primary_model: parsed.data.primaryModel,
    fallback_models: parsed.data.fallbackModels,
    enabled: parsed.data.enabled,
  });
  return jsonOk(policy, 201);
}
