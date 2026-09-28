import { listUsage } from "@/lib/store";
import { jsonOk } from "@/lib/utils";
import { withApi } from "../_utils";

export async function OPTIONS(request: Request) {
  return withApi(request, "usage:read", async () => new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  return withApi(request, "usage:read", async (ctx) => {
    const logs = await listUsage(ctx.project.id);
    const totals = logs.reduce(
      (acc, log) => {
        acc.requests += 1;
        acc.promptTokens += log.prompt_tokens;
        acc.completionTokens += log.completion_tokens;
        acc.errors += log.status === "error" ? 1 : 0;
        return acc;
      },
      { requests: 0, promptTokens: 0, completionTokens: 0, errors: 0 },
    );
    return jsonOk({ totals, logs: logs.slice(0, 100) });
  });
}
