import { requirePlatformAdmin } from "@/lib/dashboard-auth";
import { updateProviderCredentialSchema } from "@/lib/schemas";
import {
  deleteProviderCredential,
  getProviderCredential,
  publicCredential,
  updateProviderCredential,
} from "@/lib/store";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requirePlatformAdmin();
  if ("response" in auth) return auth.response;
  const existing = await getProviderCredential(id);
  if (!existing) return jsonError("Credential not found", 404);
  const raw = await readJsonLimited<unknown>(request);
  const parsed = updateProviderCredentialSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid credential payload", 422);
  const updated = await updateProviderCredential(id, parsed.data);
  return jsonOk(updated ? publicCredential(updated) : null);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requirePlatformAdmin();
  if ("response" in auth) return auth.response;
  const existing = await getProviderCredential(id);
  if (!existing) return jsonError("Credential not found", 404);
  await deleteProviderCredential(id);
  return jsonOk({ deleted: true });
}
