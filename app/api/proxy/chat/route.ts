import { chatRequestSchema } from "@/lib/schemas";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function POST(request: Request) {
  const env = getEnv();
  const raw = await readJsonLimited<unknown>(request);
  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Invalid payload", 422);
  const key = request.headers.get("x-server-api-key") || process.env.AGENT_API_KEY;
  if (!key) {
    return jsonError("Configure AGENT_API_KEY on the server that hosts this proxy.", 500);
  }
  const upstream = await fetch(`${env.APP_URL}/api/v1/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed.data),
  });
  const json = await upstream.json();
  if (!upstream.ok) return Response.json(json, { status: upstream.status });
  return jsonOk(json.data);
}
