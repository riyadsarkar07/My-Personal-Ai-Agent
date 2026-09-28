import { generateApiKey } from "@/lib/crypto";
import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { createApiKeySchema } from "@/lib/schemas";
import { createApiKeyRecord, listApiKeys, listProjectsForUser, writeAudit } from "@/lib/store";
import { clientIp, jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (projectId) {
    await requireProjectAccess(auth.user.id, projectId);
    return jsonOk(await listApiKeys(projectId));
  }
  const projects = await listProjectsForUser(auth.user.id);
  const nested = await Promise.all(projects.map((p) => listApiKeys(p.id)));
  return jsonOk(nested.flat());
}

export async function POST(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const raw = await readJsonLimited<unknown>(request);
  const parsed = createApiKeySchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid API key payload", 422);
  const projects = await listProjectsForUser(auth.user.id);
  const projectId = parsed.data.projectId || projects[0]?.id;
  if (!projectId) return jsonError("Create a project first", 400);
  await requireProjectAccess(auth.user.id, projectId);
  const generated = generateApiKey("live");
  const record = await createApiKeyRecord({
    project_id: projectId,
    name: parsed.data.name,
    raw: generated.raw,
    prefix: generated.prefix,
    permissions: parsed.data.permissions,
    expires_at: parsed.data.expiresAt ?? null,
  });
  await writeAudit({
    user_id: auth.user.id,
    project_id: projectId,
    action: "api_key.create",
    resource: record.id,
    metadata: { name: record.name, prefix: record.key_prefix },
    ip: clientIp(request),
  });
  return jsonOk({ ...record, raw: generated.raw }, 201);
}
