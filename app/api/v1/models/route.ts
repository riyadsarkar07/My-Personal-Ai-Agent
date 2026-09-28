import { CATALOG_MODELS, PROVIDER_LABELS } from "@/lib/ai/catalog";
import { jsonOk } from "@/lib/utils";
import { withApi } from "../_utils";

export async function OPTIONS(request: Request) {
  return withApi(request, "agents:read", async () => new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  return withApi(request, "agents:read", async () => {
    return jsonOk(
      CATALOG_MODELS.map((model) => ({
        ...model,
        providerLabel: PROVIDER_LABELS[model.provider],
        estimatedPricing: {
          ...model.pricing,
          note: "Catalog estimate only — not actual provider billing.",
        },
      })),
    );
  });
}
