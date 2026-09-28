import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { listApiKeys, revokeApiKey, writeAudit } from "@/lib/store";
import { clientIp, jsonError, jsonOk } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const projects = await import("@/lib/store").then((m) => m.listProjectsForUser(auth.user.id));
  const keys = (await Promise.all(projects.map((p) => listApiKeys(p.id)))).flat();
  const key = keys.find((k) => k.id === id);
  if (!key) return jsonError("API key not found", 404);
  await requireProjectAccess(auth.user.id, key.project_id);
  await revokeApiKey(id);
  await writeAudit({
    user_id: auth.user.id,
    project_id: key.project_id,
    action: "api_key.revoke",
    resource: id,
    metadata: { prefix: key.key_prefix },
    ip: clientIp(request),
  });
  return jsonOk({ revoked: true });
}
