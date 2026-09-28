import { requireDashboardUser } from "@/lib/dashboard-auth";
import {
  listAgents,
  listApiKeys,
  listConversations,
  listProjectsForUser,
  listUsage,
} from "@/lib/store";
import { jsonOk } from "@/lib/utils";

export async function GET() {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth.response;
  const projects = await listProjectsForUser(auth.user.id);
  const agents = (await Promise.all(projects.map((p) => listAgents(p.id)))).flat();
  const keys = (await Promise.all(projects.map((p) => listApiKeys(p.id)))).flat();
  const conversations = (await Promise.all(projects.map((p) => listConversations(p.id)))).flat();
  const usage = (await Promise.all(projects.map((p) => listUsage(p.id)))).flat();
  const totals = usage.reduce(
    (acc, log) => {
      acc.requests += 1;
        acc.tokens += log.prompt_tokens + log.completion_tokens;
        acc.errors += log.status === "error" ? 1 : 0;
        acc.latency += log.latency_ms;
        acc.estimatedCostUsd += log.estimated_cost_usd ?? 0;
        return acc;
      },
      { requests: 0, tokens: 0, errors: 0, latency: 0, estimatedCostUsd: 0 },
    );
  return jsonOk({
    projects: projects.length,
    agents: agents.length,
    keys: keys.filter((k) => k.status === "active").length,
    conversations: conversations.length,
    requests: totals.requests,
    tokens: totals.tokens,
    errors: totals.errors,
    estimatedCostUsd: totals.estimatedCostUsd,
    avgLatency: totals.requests ? Math.round(totals.latency / totals.requests) : 0,
    recentUsage: usage.slice(0, 12),
    recentConversations: conversations.slice(0, 6),
    agentsList: agents.slice(0, 6),
    projectsList: projects,
  });
}
