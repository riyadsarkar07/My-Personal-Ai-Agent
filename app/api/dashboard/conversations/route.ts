import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { listConversations, listProjectsForUser } from "@/lib/store";
import { jsonOk } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (projectId) {
    await requireProjectAccess(auth.user.id, projectId);
    return jsonOk(await listConversations(projectId));
  }
  const projects = await listProjectsForUser(auth.user.id);
  const nested = await Promise.all(projects.map((p) => listConversations(p.id)));
  return jsonOk(nested.flat());
}
