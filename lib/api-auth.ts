import { hashApiKey } from "./crypto";
import { getApiKeyByHash, getProject, listAgents, seedDefaults, touchApiKey } from "./store";
import { consumeRateLimit, rateLimitHeaders } from "./rate-limit";
import { jsonError } from "./utils";
import type { Agent, ApiKeyRecord, Project } from "./types";

export interface ApiContext {
  project: Project;
  apiKey: ApiKeyRecord;
  agents: Agent[];
}

function extractKey(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return request.headers.get("x-api-key");
}

export async function authenticateApiRequest(
  request: Request,
  permission?: string,
): Promise<{ ctx: ApiContext } | { response: Response }> {
  await seedDefaults();
  const raw = extractKey(request);
  if (!raw) {
    return { response: jsonError("Missing API key", 401) };
  }
  if (!raw.startsWith("uag_")) {
    return { response: jsonError("Invalid API key", 401) };
  }
  const record = await getApiKeyByHash(hashApiKey(raw));
  if (!record || record.status !== "active") {
    return { response: jsonError("Invalid or revoked API key", 401) };
  }
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    return { response: jsonError("API key expired", 401) };
  }
  if (permission && !record.permissions.includes(permission) && !record.permissions.includes("*")) {
    return { response: jsonError("Insufficient API key permissions", 403) };
  }
  const project = await getProject(record.project_id);
  if (!project || project.status !== "active") {
    return { response: jsonError("Project is not active", 403) };
  }

  const minute = consumeRateLimit(`rpm:${record.id}`, project.rate_limit_rpm, 60_000);
  const day = consumeRateLimit(`rpd:${record.id}`, project.rate_limit_rpd, 86_400_000);
  if (!minute.allowed || !day.allowed) {
    const headers = rateLimitHeaders(minute.allowed ? day : minute, minute.allowed ? project.rate_limit_rpd : project.rate_limit_rpm);
    return {
      response: new Response(JSON.stringify({ error: { message: "Rate limit exceeded", status: 429 } }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...headers, "Retry-After": "60" },
      }),
    };
  }

  await touchApiKey(record.id);
  const agents = await listAgents(project.id);
  return { ctx: { project, apiKey: record, agents } };
}

export function corsHeaders(request: Request, allowedOrigins: string[]) {
  const origin = request.headers.get("origin");
  const allow =
    origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin) || allowedOrigins.length === 0)
      ? origin
      : allowedOrigins[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
