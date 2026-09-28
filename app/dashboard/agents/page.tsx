"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { CATALOG_MODELS } from "@/lib/ai/catalog";
import type { Agent, Project } from "@/lib/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Agent | null>(null);

  async function load() {
    const [a, p] = await Promise.all([fetch("/api/dashboard/agents"), fetch("/api/dashboard/projects")]);
    setAgents((await a.json()).data ?? []);
    setProjects((await p.json()).data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [a, p] = await Promise.all([fetch("/api/dashboard/agents"), fetch("/api/dashboard/projects")]);
      if (cancelled) return;
      setAgents((await a.json()).data ?? []);
      setProjects((await p.json()).data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      description: form.get("description"),
      projectId: form.get("projectId"),
      model: form.get("model"),
      fallbackModels: String(form.get("fallbackModels") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      systemInstruction: form.get("systemInstruction"),
      temperature: Number(form.get("temperature")),
      maxTokens: Number(form.get("maxTokens")),
      memoryEnabled: form.get("memoryEnabled") === "on",
      toolsEnabled: form.get("toolsEnabled") === "on",
    };
    const url = editing ? `/api/dashboard/agents/${editing.id}` : "/api/dashboard/agents";
    await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this agent?")) return;
    await fetch(`/api/dashboard/agents/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Agents</h1>
      <div className="grid gap-6 lg:grid-cols-5">
        <form key={editing?.id ?? "create"} onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-medium">{editing ? "Edit agent" : "Create agent"}</h2>
          <div className="mt-4">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={editing?.name} />
          </div>
          <div className="mt-3">
            <Label htmlFor="projectId">Project</Label>
            <select
              id="projectId"
              name="projectId"
              defaultValue={editing?.project_id}
              className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="model">Primary model</Label>
            <select
              id="model"
              name="model"
              defaultValue={editing?.model ?? "gemini-2.0-flash"}
              className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
            >
              {CATALOG_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.provider})
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="fallbackModels">Fallback models (comma separated)</Label>
            <Input
              id="fallbackModels"
              name="fallbackModels"
              defaultValue={editing?.fallback_models?.join(", ") ?? "gpt-4o-mini, claude-3-5-haiku-20241022"}
            />
          </div>
          <div className="mt-3">
            <Label htmlFor="systemInstruction">System instruction</Label>
            <Textarea
              id="systemInstruction"
              name="systemInstruction"
              rows={6}
              defaultValue={editing?.system_instruction ?? "You are a helpful AI agent."}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" name="temperature" type="number" step="0.1" defaultValue={editing?.temperature ?? 0.7} />
            </div>
            <div>
              <Label htmlFor="maxTokens">Max tokens</Label>
              <Input id="maxTokens" name="maxTokens" type="number" defaultValue={editing?.max_tokens ?? 2048} />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="memoryEnabled" defaultChecked={editing?.memory_enabled ?? true} />
            Conversation memory
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="toolsEnabled" defaultChecked={editing?.tools_enabled ?? false} />
            Enable sandboxed tools
          </label>
          <Button className="mt-4 w-full">{editing ? "Save agent" : "Create agent"}</Button>
        </form>
        <div className="space-y-3 lg:col-span-3">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{agent.name}</h3>
                    <Badge tone={agent.status === "active" ? "success" : "neutral"}>{agent.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{agent.model}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{agent.system_instruction}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" type="button" onClick={() => setEditing(agent)}>
                    Edit
                  </Button>
                  <Button variant="danger" type="button" onClick={() => remove(agent.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
