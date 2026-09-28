import { requireAdmin, requireProjectAccess } from "@/lib/dashboard-auth";
import { routingPolicySchema } from "@/lib/schemas";
import { deleteRoutingPolicy, getRoutingPolicy, updateRoutingPolicy } from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const existing = await getRoutingPolicy(id);
  if (!existing) return jsonError("Routing policy not found", 404);
  if (existing.project_id) await requireProjectAccess(auth.user.id, existing.project_id);
  const raw = await readJsonLimited<unknown>(request);
  const parsed = routingPolicySchema.partial().safeParse(raw);
  if (!parsed.success) return jsonError("Invalid routing payload", 422);
  const updated = await updateRoutingPolicy(id, {
    name: parsed.data.name,
    primary_model: parsed.data.primaryModel,
    fallback_models: parsed.data.fallbackModels,
    enabled: parsed.data.enabled,
    project_id: parsed.data.projectId === undefined ? existing.project_id : parsed.data.projectId,
  });
  return jsonOk(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const existing = await getRoutingPolicy(id);
  if (!existing) return jsonError("Routing policy not found", 404);
  if (existing.project_id) await requireProjectAccess(auth.user.id, existing.project_id);
  await deleteRoutingPolicy(id);
  return jsonOk({ deleted: true });
}
