import { requirePlatformAdmin } from "@/lib/dashboard-auth";
import { getAdapter } from "@/lib/ai/providers";
import { PROVIDER_IDS, PROVIDER_LABELS } from "@/lib/ai/catalog";
import { envKeyForProvider } from "@/lib/env";
import { decryptCredential, listProviderCredentials } from "@/lib/store";
import { jsonOk } from "@/lib/utils";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("response" in auth) return auth.response;
  const credentials = await listProviderCredentials();
  const health = await Promise.all(
    PROVIDER_IDS.map(async (id) => {
      const stored = credentials.find((c) => c.provider === id && c.status === "active");
      let apiKey = envKeyForProvider(id);
      let source: "credential" | "env" | "none" = apiKey ? "env" : "none";
      if (stored) {
        try {
          apiKey = decryptCredential(stored);
          source = "credential";
        } catch {
          source = apiKey ? "env" : "none";
        }
      }
      if (!apiKey) {
        return { id, label: PROVIDER_LABELS[id], ok: false, latencyMs: 0, message: "No key", source };
      }
      const result = await getAdapter(id).health(apiKey);
      return { id, label: PROVIDER_LABELS[id], ...result, source };
    }),
  );
  return jsonOk(health);
}
