"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Bot, KeyRound, MessageSquare } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

type Overview = {
  projects: number;
  agents: number;
  keys: number;
  conversations: number;
  requests: number;
  tokens: number;
  errors: number;
  avgLatency: number;
  recentUsage: { created_at: string; prompt_tokens: number; completion_tokens: number; status: string }[];
  recentConversations: { id: string; title: string; updated_at: string }[];
  agentsList: { id: string; name: string; model: string; status: string }[];
  projectsList: { id: string; name: string }[];
};

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => setData(null));
  }, []);

  const chart = (data?.recentUsage ?? [])
    .slice()
    .reverse()
    .map((u, i) => ({
      name: `#${i + 1}`,
      tokens: u.prompt_tokens + u.completion_tokens,
    }));

  const stats = [
    { label: "Projects", value: data?.projects ?? 0, icon: Activity },
    { label: "Agents", value: data?.agents ?? 0, icon: Bot },
    { label: "Active keys", value: data?.keys ?? 0, icon: KeyRound },
    { label: "Conversations", value: data?.conversations ?? 0, icon: MessageSquare },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted">Live usage across every isolated project.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between text-muted">
                <span className="text-sm">{stat.label}</span>
                <Icon size={16} aria-hidden />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums">{formatNumber(stat.value)}</p>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-muted">Token throughput</h2>
          <div className="h-56">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <XAxis dataKey="name" stroke="#a5a3b8" fontSize={12} />
                  <YAxis stroke="#a5a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#151526", border: "1px solid #2a2740" }} />
                  <Area type="monotone" dataKey="tokens" stroke="#a78bfa" fill="#7c3aed33" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">No usage yet. Send a playground message.</p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-muted">Health</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Requests</dt>
              <dd className="tabular-nums">{formatNumber(data?.requests ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Tokens</dt>
              <dd className="tabular-nums">{formatNumber(data?.tokens ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Errors</dt>
              <dd className="tabular-nums">{formatNumber(data?.errors ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Avg latency</dt>
              <dd className="tabular-nums">{data?.avgLatency ?? 0} ms</dd>
            </div>
          </dl>
          <Link href="/dashboard/playground" className="mt-6 inline-flex text-sm text-secondary hover:underline">
            Open playground
          </Link>
        </Card>
      </div>
    </div>
  );
}
