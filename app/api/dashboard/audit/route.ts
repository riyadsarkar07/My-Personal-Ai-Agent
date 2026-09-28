import { requireAdmin } from "@/lib/dashboard-auth";
import { listAudit } from "@/lib/store";
import { jsonOk } from "@/lib/utils";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  return jsonOk(await listAudit(200));
}
