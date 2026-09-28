import { deleteConversationRecord, getConversation, listMessages } from "@/lib/store";
import { jsonError, jsonOk } from "@/lib/utils";
import { withApi } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function OPTIONS(request: Request) {
  return withApi(request, "conversations:read", async () => new Response(null, { status: 204 }));
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return withApi(request, "conversations:read", async (ctx) => {
    const conversation = await getConversation(id);
    if (!conversation || conversation.project_id !== ctx.project.id) {
      return jsonError("Conversation not found", 404);
    }
    const messages = await listMessages(id);
    return jsonOk({ ...conversation, messages });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return withApi(request, "conversations:write", async (ctx) => {
    const conversation = await getConversation(id);
    if (!conversation || conversation.project_id !== ctx.project.id) {
      return jsonError("Conversation not found", 404);
    }
    await deleteConversationRecord(id);
    return jsonOk({ deleted: true });
  });
}
