import { requireDashboardUser } from "@/lib/dashboard-auth";
import { createProjectSchema } from "@/lib/schemas";
import { createProjectRecord, listProjectsForUser, writeAudit } from "@/lib/store";
import { clientIp, jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function GET() {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const projects = await listProjectsForUser(auth.user.id);
  return jsonOk(projects);
}

export async function POST(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const raw = await readJsonLimited<unknown>(request);
  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid project payload", 422);
  const project = await createProjectRecord({
    owner_id: auth.user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    rate_limit_rpm: parsed.data.rateLimitRpm,
    rate_limit_rpd: parsed.data.rateLimitRpd,
    max_tokens_per_request: parsed.data.maxTokensPerRequest,
    status: "active",
    allowed_origins: parsed.data.allowedOrigins,
  });
  await writeAudit({
    user_id: auth.user.id,
    project_id: project.id,
    action: "project.create",
    resource: project.id,
    metadata: { name: project.name },
    ip: clientIp(request),
  });
  return jsonOk(project, 201);
}
