import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { updateProjectSchema } from "@/lib/schemas";
import { getProject, updateProjectRecord } from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  await requireProjectAccess(auth.user.id, id);
  const project = await getProject(id);
  if (!project) return jsonError("Project not found", 404);
  return jsonOk(project);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  await requireProjectAccess(auth.user.id, id);
  const raw = await readJsonLimited<unknown>(request);
  const parsed = updateProjectSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid project payload", 422);
  const updated = await updateProjectRecord(id, {
    name: parsed.data.name,
    description: parsed.data.description,
    rate_limit_rpm: parsed.data.rateLimitRpm,
    rate_limit_rpd: parsed.data.rateLimitRpd,
    max_tokens_per_request: parsed.data.maxTokensPerRequest,
    allowed_origins: parsed.data.allowedOrigins,
    status: parsed.data.status,
  });
  return jsonOk(updated);
}
