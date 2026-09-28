import { requireDashboardUser } from "@/lib/dashboard-auth";
import { getAdapter } from "@/lib/ai/providers";
import {
  decryptCredential,
  getProviderCredential,
  publicCredential,
  updateProviderCredential,
} from "@/lib/store";
import { jsonError, jsonOk, nowIso } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const existing = await getProviderCredential(id);
  if (!existing) return jsonError("Credential not found", 404);
  let apiKey = "";
  try {
    apiKey = decryptCredential(existing);
  } catch {
    return jsonError("Stored credential could not be decrypted", 400);
  }
  const health = await getAdapter(existing.provider).health(apiKey);
  const updated = await updateProviderCredential(id, {
    status: health.ok ? "active" : "invalid",
    last_validated_at: nowIso(),
    last_error: health.ok ? null : health.message,
  });
  return jsonOk({
    credential: updated ? publicCredential(updated) : publicCredential(existing),
    health,
  });
}
