import { authenticateApiRequest, corsHeaders } from "@/lib/api-auth";
import { ChatError } from "@/lib/ai/chat";
import { jsonError, readJsonLimited } from "@/lib/utils";
import type { ApiContext } from "@/lib/api-auth";
import type { ZodType } from "zod";

export async function withApi(
  request: Request,
  permission: string | undefined,
  handler: (ctx: ApiContext) => Promise<Response>,
) {
  const originHeaders = corsHeaders(request, []);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: originHeaders });
  }
  const auth = await authenticateApiRequest(request, permission);
  if ("response" in auth) {
    const body = await auth.response.text();
    return new Response(body, {
      status: auth.response.status,
      headers: { "Content-Type": "application/json", ...originHeaders },
    });
  }
  try {
    const response = await handler(auth.ctx);
    const headers = new Headers(response.headers);
    Object.entries(originHeaders).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const status = error instanceof ChatError ? error.status : (error as { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: { message, status } }), {
      status,
      headers: { "Content-Type": "application/json", ...originHeaders },
    });
  }
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const raw = await readJsonLimited<unknown>(request);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw Object.assign(new Error(parsed.error.issues.map((i) => i.message).join(", ")), { status: 422 });
  }
  return parsed.data;
}

export { jsonError };
