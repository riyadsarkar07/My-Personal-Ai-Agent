"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/ai/catalog";

type Cred = {
  id: string;
  provider: ProviderId;
  label: string;
  key_prefix: string;
  status: string;
  last_validated_at: string | null;
  last_error: string | null;
  priority: number;
};

type Health = { id: ProviderId; label: string; ok: boolean; latencyMs: number; message: string; source: string };

type Payload = {
  providers: {
    id: ProviderId;
    label: string;
    envConfigured: boolean;
    credentials: Cred[];
    models: { id: string; displayName: string }[];
  }[];
};

export default function ProvidersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [health, setHealth] = useState<Health[]>([]);
  const [failover, setFailover] = useState<{ id: string; provider: string; model: string; status: string; error: string | null; created_at: string }[]>([]);

  async function load() {
    const [p, h, f] = await Promise.all([
      fetch("/api/dashboard/providers"),
      fetch("/api/dashboard/health"),
      fetch("/api/dashboard/failover"),
    ]);
    setData((await p.json()).data ?? null);
    setHealth((await h.json()).data ?? []);
    setFailover((await f.json()).data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, h, f] = await Promise.all([
        fetch("/api/dashboard/providers"),
        fetch("/api/dashboard/health"),
        fetch("/api/dashboard/failover"),
      ]);
      if (cancelled) return;
      setData((await p.json()).data ?? null);
      if (cancelled) return;
      setHealth((await h.json()).data ?? []);
      if (cancelled) return;
      setFailover((await f.json()).data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/dashboard/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: form.get("provider"),
        label: form.get("label"),
        apiKey: form.get("apiKey"),
        priority: Number(form.get("priority") || 0),
      }),
    });
    event.currentTarget.reset();
    load();
  }

  async function validate(id: string) {
    await fetch(`/api/dashboard/providers/${id}/validate`, { method: "POST" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this provider key?")) return;
    await fetch(`/api/dashboard/providers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Providers</h1>
        <p className="text-sm text-muted">Server-side credentials only. Raw keys are encrypted at rest and never shown again.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PROVIDER_IDS.map((id) => {
          const row = health.find((h) => h.id === id);
          const provider = data?.providers.find((p) => p.id === id);
          return (
            <Card key={id}>
              <p className="text-sm text-muted">{PROVIDER_LABELS[id]}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={row?.ok ? "success" : "danger"}>{row?.ok ? "healthy" : "down"}</Badge>
                {provider?.envConfigured ? <Badge tone="accent">env</Badge> : null}
              </div>
              <p className="mt-3 text-xs text-muted">{row?.message ?? "unchecked"}</p>
              <p className="mt-1 text-xs tabular-nums text-muted">{row?.latencyMs ?? 0} ms</p>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-medium">Add API key</h2>
          <div className="mt-4">
            <Label htmlFor="provider">Provider</Label>
            <select id="provider" name="provider" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">
              {PROVIDER_IDS.map((id) => (
                <option key={id} value={id}>
                  {PROVIDER_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" required placeholder="Production key" />
          </div>
          <div className="mt-3">
            <Label htmlFor="apiKey">API key</Label>
            <Input id="apiKey" name="apiKey" type="password" required autoComplete="off" />
          </div>
          <div className="mt-3">
            <Label htmlFor="priority">Priority (0 = first)</Label>
            <Input id="priority" name="priority" type="number" defaultValue={0} />
          </div>
          <Button className="mt-4 w-full">Store encrypted key</Button>
        </form>
        <div className="space-y-3 lg:col-span-3">
          {(data?.providers ?? []).flatMap((p) => p.credentials).length === 0 ? (
            <Card>
              <p className="text-sm text-muted">No stored credentials yet. Environment variables still work as a fallback.</p>
            </Card>
          ) : (
            (data?.providers ?? []).flatMap((p) =>
              p.credentials.map((cred) => (
                <Card key={cred.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{cred.label}</h3>
                        <Badge tone={cred.status === "active" ? "success" : "danger"}>{cred.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {PROVIDER_LABELS[cred.provider]} · {cred.key_prefix}
                      </p>
                      {cred.last_error ? <p className="mt-2 text-sm text-destructive">{cred.last_error}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" type="button" onClick={() => validate(cred.id)}>
                        Validate
                      </Button>
                      <Button variant="danger" type="button" onClick={() => remove(cred.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              )),
            )
          )}
        </div>
      </div>
      <Card>
        <h2 className="mb-3 text-sm font-medium text-muted">Failover history</h2>
        {failover.length === 0 ? (
          <p className="text-sm text-muted">No failover events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2">Time</th>
                  <th className="py-2">Provider</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {failover.slice(0, 25).map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 text-muted">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="py-2">{row.provider}</td>
                    <td className="py-2 font-mono text-xs">{row.model}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2 text-destructive">{row.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
