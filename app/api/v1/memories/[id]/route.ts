import { deleteMemory, getMemory } from "@/lib/store";
import { jsonError, jsonOk } from "@/lib/utils";
import { withApi } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function OPTIONS(request: Request) {
  return withApi(request, "agents:read", async () => new Response(null, { status: 204 }));
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return withApi(request, "agents:write", async (ctx) => {
    const existing = await getMemory(id);
    if (!existing || existing.project_id !== ctx.project.id) return jsonError("Memory not found", 404);
    await deleteMemory(id);
    return jsonOk({ deleted: true });
  });
}
