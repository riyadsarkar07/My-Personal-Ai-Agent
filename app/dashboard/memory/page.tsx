"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { useRealtimeTable } from "@/hooks/use-realtime";
import type { Agent, MemoryRecord, Project } from "@/lib/types";

export default function MemoryPage() {
  const [rows, setRows] = useState<MemoryRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const load = useCallback(async () => {
    const [m, p, a] = await Promise.all([
      fetch("/api/dashboard/memories"),
      fetch("/api/dashboard/projects"),
      fetch("/api/dashboard/agents"),
    ]);
    setRows((await m.json()).data ?? []);
    setProjects((await p.json()).data ?? []);
    setAgents((await a.json()).data ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, p, a] = await Promise.all([
        fetch("/api/dashboard/memories"),
        fetch("/api/dashboard/projects"),
        fetch("/api/dashboard/agents"),
      ]);
      if (cancelled) return;
      setRows((await m.json()).data ?? []);
      if (cancelled) return;
      setProjects((await p.json()).data ?? []);
      if (cancelled) return;
      setAgents((await a.json()).data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useRealtimeTable("memories", load);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/dashboard/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.get("projectId"),
        agentId: form.get("agentId") || null,
        key: form.get("key"),
        content: form.get("content"),
      }),
    });
    event.currentTarget.reset();
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this memory?")) return;
    await fetch(`/api/dashboard/memories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Memory</h1>
        <p className="text-sm text-muted">Project-scoped facts injected into chats when memory is enabled on the agent.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-medium">Store memory</h2>
          <div className="mt-4">
            <Label htmlFor="projectId">Project</Label>
            <select id="projectId" name="projectId" required className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="agentId">Agent (optional)</Label>
            <select id="agentId" name="agentId" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">
              <option value="">Project-wide</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="key">Key</Label>
            <Input id="key" name="key" required placeholder="preferred_name" />
          </div>
          <div className="mt-3">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" name="content" rows={5} required />
          </div>
          <Button className="mt-4 w-full">Save memory</Button>
        </form>
        <div className="space-y-3 lg:col-span-3">
          {rows.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">No memories stored. Facts stay isolated per project.</p>
            </Card>
          ) : (
            rows.map((row) => (
              <Card key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{row.key}</h3>
                    <p className="mt-1 text-sm text-muted">{row.content}</p>
                    <p className="mt-2 font-mono text-xs text-muted">{row.project_id}</p>
                  </div>
                  <Button variant="danger" type="button" onClick={() => remove(row.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
