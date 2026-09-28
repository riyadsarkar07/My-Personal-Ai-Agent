import { requireDashboardUser, requireProjectAccess } from "@/lib/dashboard-auth";
import { deleteConversationRecord, getConversation, listMessages } from "@/lib/store";
import { jsonError, jsonOk } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const conversation = await getConversation(id);
  if (!conversation) return jsonError("Conversation not found", 404);
  await requireProjectAccess(auth.user.id, conversation.project_id);
  const messages = await listMessages(id);
  return jsonOk({ ...conversation, messages });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const conversation = await getConversation(id);
  if (!conversation) return jsonError("Conversation not found", 404);
  await requireProjectAccess(auth.user.id, conversation.project_id);
  await deleteConversationRecord(id);
  return jsonOk({ deleted: true });
}
