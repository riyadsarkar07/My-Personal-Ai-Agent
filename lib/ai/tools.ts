import type { AgentTool } from "../types";

const ALLOWED_TOOLS = new Set(["web_search", "calculator", "current_time", "json_extract"]);

export const BUILTIN_TOOLS: AgentTool[] = [
  {
    id: "tool_calculator",
    agent_id: "*",
    name: "calculator",
    description: "Evaluate a basic arithmetic expression. Supports +, -, *, /, and parentheses.",
    parameters_schema: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Arithmetic expression to evaluate" },
      },
      required: ["expression"],
    },
    enabled: true,
    execution_mode: "sandbox",
    created_at: new Date(0).toISOString(),
  },
  {
    id: "tool_current_time",
    agent_id: "*",
    name: "current_time",
    description: "Return the current UTC timestamp.",
    parameters_schema: {
      type: "object",
      properties: {},
    },
    enabled: true,
    execution_mode: "sandbox",
    created_at: new Date(0).toISOString(),
  },
  {
    id: "tool_json_extract",
    agent_id: "*",
    name: "json_extract",
    description: "Parse a JSON string and return a named field.",
    parameters_schema: {
      type: "object",
      properties: {
        json: { type: "string" },
        path: { type: "string", description: "Dot-separated path such as user.name" },
      },
      required: ["json", "path"],
    },
    enabled: true,
    execution_mode: "sandbox",
    created_at: new Date(0).toISOString(),
  },
];

function safeEvalArithmetic(expression: string): string {
  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    throw new Error("Only numeric arithmetic is allowed");
  }
  const fn = new Function(`"use strict"; return (${expression});`);
  const result = fn();
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Expression did not produce a finite number");
  }
  return String(result);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  enabled: boolean,
): Promise<{ ok: boolean; result: string }> {
  if (!enabled || !ALLOWED_TOOLS.has(name)) {
    return { ok: false, result: `Tool "${name}" is not permitted.` };
  }
  try {
    if (name === "calculator") {
      return { ok: true, result: safeEvalArithmetic(String(args.expression ?? "")) };
    }
    if (name === "current_time") {
      return { ok: true, result: new Date().toISOString() };
    }
    if (name === "json_extract") {
      const parsed = JSON.parse(String(args.json ?? "{}"));
      const path = String(args.path ?? "");
      const value = path.split(".").reduce((acc: unknown, key) => {
        if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
        return undefined;
      }, parsed as unknown);
      return { ok: true, result: JSON.stringify(value ?? null) };
    }
    if (name === "web_search") {
      return { ok: false, result: "web_search is disabled in this deployment." };
    }
    return { ok: false, result: "Unknown tool" };
  } catch (error) {
    return { ok: false, result: error instanceof Error ? error.message : "Tool failed" };
  }
}

export function toGeminiDeclarations(tools: AgentTool[]) {
  return tools
    .filter((t) => t.enabled && ALLOWED_TOOLS.has(t.name))
    .map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.parameters_schema,
    }));
}
