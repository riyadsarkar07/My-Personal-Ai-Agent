import { bootstrapPrimaryAdmin } from "@/lib/auth";
import { sessionUserPayload, getCurrentUser } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  await bootstrapPrimaryAdmin();
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk(sessionUserPayload(user));
}
