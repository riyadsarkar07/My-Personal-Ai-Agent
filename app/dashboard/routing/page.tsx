"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { CATALOG_MODELS } from "@/lib/ai/catalog";
import type { Agent, Project, RoutingPolicy } from "@/lib/types";

export default function RoutingPage() {
  const [policies, setPolicies] = useState<RoutingPolicy[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  async function load() {
    const [r, p, a] = await Promise.all([
      fetch("/api/dashboard/routing"),
      fetch("/api/dashboard/projects"),
      fetch("/api/dashboard/agents"),
    ]);
    setPolicies((await r.json()).data ?? []);
    setProjects((await p.json()).data ?? []);
    setAgents((await a.json()).data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [r, p, a] = await Promise.all([
        fetch("/api/dashboard/routing"),
        fetch("/api/dashboard/projects"),
        fetch("/api/dashboard/agents"),
      ]);
      if (cancelled) return;
      setPolicies((await r.json()).data ?? []);
      if (cancelled) return;
      setProjects((await p.json()).data ?? []);
      if (cancelled) return;
      setAgents((await a.json()).data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fallbacks = String(form.get("fallbackModels") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await fetch("/api/dashboard/routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        projectId: form.get("projectId") || null,
        primaryModel: form.get("primaryModel"),
        fallbackModels: fallbacks,
        enabled: true,
      }),
    });
    event.currentTarget.reset();
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this routing policy?")) return;
    await fetch(`/api/dashboard/routing/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Routing</h1>
        <p className="text-sm text-muted">Primary models plus ordered backups used by automatic failover.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-medium">New policy</h2>
          <div className="mt-4">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Default chat route" />
          </div>
          <div className="mt-3">
            <Label htmlFor="projectId">Project (optional)</Label>
            <select id="projectId" name="projectId" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">
              <option value="">Global</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="primaryModel">Primary model</Label>
            <select id="primaryModel" name="primaryModel" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">
              {CATALOG_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="fallbackModels">Fallback models (comma separated)</Label>
            <Input id="fallbackModels" name="fallbackModels" placeholder="gpt-4o-mini, claude-3-5-haiku-20241022" />
          </div>
          <Button className="mt-4 w-full">Save policy</Button>
        </form>
        <div className="space-y-3 lg:col-span-3">
          <Card>
            <h2 className="text-sm font-medium text-muted">Agent fallbacks</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-muted"> · {agent.model}</span>
                  {agent.fallback_models?.length ? (
                    <span className="text-muted"> → {agent.fallback_models.join(", ")}</span>
                  ) : (
                    <span className="text-muted"> · catalog defaults</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          {policies.map((policy) => (
            <Card key={policy.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{policy.name}</h3>
                    <Badge tone={policy.enabled ? "success" : "neutral"}>{policy.enabled ? "enabled" : "off"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{policy.primary_model}</p>
                  <p className="mt-1 text-xs text-muted">{policy.fallback_models.join(" → ") || "no extras"}</p>
                </div>
                <Button variant="danger" type="button" onClick={() => remove(policy.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
