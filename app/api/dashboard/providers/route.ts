import { requireAdmin } from "@/lib/dashboard-auth";
import { providerCredentialSchema } from "@/lib/schemas";
import {
  createProviderCredential,
  listProviderCredentials,
  publicCredential,
} from "@/lib/store";
import { configuredProviders } from "@/lib/env";
import { CATALOG_MODELS, PROVIDER_IDS, PROVIDER_LABELS } from "@/lib/ai/catalog";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const credentials = (await listProviderCredentials()).map(publicCredential);
  const env = configuredProviders();
  return jsonOk({
    providers: PROVIDER_IDS.map((id) => ({
      id,
      label: PROVIDER_LABELS[id],
      envConfigured: env[id],
      credentials: credentials.filter((c) => c.provider === id),
      models: CATALOG_MODELS.filter((m) => m.provider === id),
    })),
    credentials,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const raw = await readJsonLimited<unknown>(request);
  const parsed = providerCredentialSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid credential payload", 422);
  const created = await createProviderCredential({
    provider: parsed.data.provider,
    label: parsed.data.label,
    apiKey: parsed.data.apiKey,
    priority: parsed.data.priority,
  });
  return jsonOk(publicCredential(created), 201);
}
