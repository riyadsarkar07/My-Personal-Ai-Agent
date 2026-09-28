import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { deleteMemory, getMemory } from "@/lib/store";
import { jsonError, jsonOk } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const existing = await getMemory(id);
  if (!existing) return jsonError("Memory not found", 404);
  await requireProjectAccess(auth.user.id, existing.project_id);
  await deleteMemory(id);
  return jsonOk({ deleted: true });
}
