import { requireAdmin } from "@/lib/dashboard-auth";
import { publicProfile } from "@/lib/rbac";
import { listProfiles } from "@/lib/store";
import { jsonOk } from "@/lib/utils";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const profiles = await listProfiles();
  return jsonOk(profiles.map(publicProfile));
}
