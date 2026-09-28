"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import type { UsageLog } from "@/lib/types";

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    fetch("/api/dashboard/usage")
      .then((r) => r.json())
      .then((j) => setLogs(j.data ?? []));
  }, []);

  const totals = logs.reduce(
    (acc, log) => {
      acc.requests += 1;
      acc.tokens += log.prompt_tokens + log.completion_tokens;
      acc.errors += log.status === "error" ? 1 : 0;
      return acc;
    },
    { requests: 0, tokens: 0, errors: 0 },
  );

  const chart = logs
    .slice(0, 20)
    .reverse()
    .map((l, i) => ({ name: `${i + 1}`, latency: l.latency_ms, tokens: l.prompt_tokens + l.completion_tokens }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Requests</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatNumber(totals.requests)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Tokens</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatNumber(totals.tokens)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Errors</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatNumber(totals.errors)}</p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-sm text-muted">Latency (ms)</h2>
        <div className="h-64">
          {chart.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="name" stroke="#a5a3b8" fontSize={12} />
                <YAxis stroke="#a5a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: "#151526", border: "1px solid #2a2740" }} />
                <Bar dataKey="latency" fill="#0891b2" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted">No request logs yet.</p>
          )}
        </div>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Path</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tokens</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.path}</td>
                <td className="px-4 py-3">{log.status}</td>
                <td className="px-4 py-3 tabular-nums">{log.prompt_tokens + log.completion_tokens}</td>
                <td className="px-4 py-3 tabular-nums">{log.latency_ms} ms</td>
                <td className="px-4 py-3 text-destructive">{log.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
