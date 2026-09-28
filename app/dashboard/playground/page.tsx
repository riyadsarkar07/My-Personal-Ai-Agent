"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { Agent } from "@/lib/types";

type ChatLine = { role: "user" | "assistant"; content: string };

export default function PlaygroundPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/agents")
      .then((r) => r.json())
      .then((j) => {
        const list: Agent[] = j.data ?? [];
        setAgents(list);
        if (list[0]) setAgentId(list[0].id);
      });
  }, []);

  async function sendPlain(message: string) {
    const res = await fetch("/api/dashboard/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, agentId, conversationId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Request failed");
    setConversationId(json.data.conversationId);
    setLines((prev) => [...prev, { role: "assistant", content: json.data.message }]);
  }

  async function sendStream(message: string) {
    const res = await fetch("/api/dashboard/playground/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, agentId, conversationId }),
    });
    if (!res.ok || !res.body) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } }).error?.message || "Stream failed");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistant = "";
    setLines((prev) => [...prev, { role: "assistant", content: "" }]);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const event = /event: (\w+)/.exec(part)?.[1];
        const dataLine = part
          .split("\n")
          .filter((l) => l.startsWith("data: "))
          .map((l) => l.slice(6))
          .join("");
        if (!event || !dataLine) continue;
        const data = JSON.parse(dataLine) as { text?: string; conversationId?: string; message?: string };
        if (event === "meta" && data.conversationId) setConversationId(data.conversationId);
        if (event === "delta" && data.text) {
          assistant += data.text;
          const snapshot = assistant;
          setLines((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: snapshot };
            return next;
          });
        }
        if (event === "error") throw new Error(data.message || "Stream error");
      }
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = String(new FormData(form).get("message") || "");
    if (!message || !agentId) return;
    setLoading(true);
    setStatus(streaming ? "Streaming" : "Sending");
    setError("");
    setLines((prev) => [...prev, { role: "user", content: message }]);
    form.reset();
    try {
      if (streaming) await sendStream(message);
      else await sendPlain(message);
      setStatus("Complete");
    } catch (err) {
      setStatus("Error");
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Playground</h1>
          <p className="text-sm text-muted">Uses the same multi-provider gateway as POST /api/v1/chat.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={streaming} onChange={(e) => setStreaming(e.target.checked)} />
            Streaming
          </label>
          <label className="text-sm">
            Agent
            <select
              className="ml-2 min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value);
                setConversationId(undefined);
                setLines([]);
              }}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <Card className="flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="text-sm text-muted">Send a message to test the selected agent.</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className={line.role === "user" ? "text-right" : ""}>
                <div
                  className={
                    line.role === "user"
                      ? "ml-auto inline-block max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm"
                      : "inline-block max-w-[80%] rounded-2xl bg-surface-2 px-4 py-2 text-sm"
                  }
                >
                  {line.content}
                </div>
              </div>
            ))
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          Status: {status}
          {conversationId ? ` · ${conversationId}` : ""}
        </p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <Input name="message" placeholder="Ask the agent…" required disabled={loading} />
          <Button disabled={loading}>{loading ? "…" : "Send"}</Button>
        </form>
      </Card>
    </div>
  );
}
