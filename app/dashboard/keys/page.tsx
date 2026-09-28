"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import type { ApiKeyRecord, Project } from "@/lib/types";

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [raw, setRaw] = useState<string | null>(null);

  async function load() {
    const [k, p] = await Promise.all([fetch("/api/dashboard/keys"), fetch("/api/dashboard/projects")]);
    setKeys((await k.json()).data ?? []);
    setProjects((await p.json()).data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [k, p] = await Promise.all([fetch("/api/dashboard/keys"), fetch("/api/dashboard/projects")]);
      if (cancelled) return;
      setKeys((await k.json()).data ?? []);
      setProjects((await p.json()).data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/dashboard/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), projectId: form.get("projectId") }),
    });
    const json = await res.json();
    if (res.ok) {
      setRaw(json.data.raw);
      event.currentTarget.reset();
      load();
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Clients using it will fail immediately.")) return;
    await fetch(`/api/dashboard/keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">API keys</h1>
      {raw ? (
        <Card className="border-primary/40">
          <p className="text-sm font-medium">Copy this key now. It will not be shown again.</p>
          <code className="mt-2 block break-all rounded-lg bg-surface-2 p-3 text-sm">{raw}</code>
        </Card>
      ) : null}
      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-border bg-surface p-5 md:grid-cols-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Production website" />
        </div>
        <div>
          <Label htmlFor="projectId">Project</Label>
          <select id="projectId" name="projectId" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button className="w-full">Generate key</Button>
        </div>
      </form>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last used</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-t border-border">
                <td className="px-4 py-3">{key.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{key.key_prefix}…</td>
                <td className="px-4 py-3">
                  <Badge tone={key.status === "active" ? "success" : "danger"}>{key.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted">{key.last_used_at ?? "Never"}</td>
                <td className="px-4 py-3">
                  {key.status === "active" ? (
                    <Button variant="danger" type="button" onClick={() => revoke(key.id)}>
                      Revoke
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
