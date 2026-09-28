import { listConversations, listMessages } from "@/lib/store";
import { jsonOk } from "@/lib/utils";
import { withApi } from "../_utils";

export async function OPTIONS(request: Request) {
  return withApi(request, "conversations:read", async () => new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  return withApi(request, "conversations:read", async (ctx) => {
    const conversations = await listConversations(ctx.project.id);
    const include = new URL(request.url).searchParams.get("include") === "messages";
    if (!include) return jsonOk(conversations);
    const withMessages = await Promise.all(
      conversations.map(async (c) => ({ ...c, messages: await listMessages(c.id) })),
    );
    return jsonOk(withMessages);
  });
}
