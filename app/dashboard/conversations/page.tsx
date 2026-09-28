"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { relativeTime } from "@/lib/utils";
import type { Conversation, Message } from "@/lib/types";

export default function ConversationsPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [active, setActive] = useState<(Conversation & { messages: Message[] }) | null>(null);

  async function load() {
    const res = await fetch("/api/dashboard/conversations");
    setItems((await res.json()).data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/dashboard/conversations");
      const json = await res.json();
      if (!cancelled) setItems(json.data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function open(id: string) {
    const res = await fetch(`/api/dashboard/conversations/${id}`);
    setActive((await res.json()).data);
  }

  async function remove(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/dashboard/conversations/${id}`, { method: "DELETE" });
    setActive(null);
    load();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-1">
        <h1 className="text-2xl font-semibold">Conversations</h1>
        {items.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => open(c.id)}
            className="w-full cursor-pointer rounded-xl border border-border bg-surface p-4 text-left hover:border-secondary"
          >
            <p className="font-medium">{c.title}</p>
            <p className="mt-1 text-xs text-muted">{relativeTime(c.updated_at)}</p>
          </button>
        ))}
      </div>
      <Card className="lg:col-span-2 min-h-[420px]">
        {active ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium">{active.title}</h2>
              <Button variant="danger" type="button" onClick={() => remove(active.id)}>
                Delete
              </Button>
            </div>
            <div className="space-y-3">
              {active.messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-surface-2 p-3 text-sm">
                  <p className="mb-1 text-xs uppercase text-muted">{m.role}</p>
                  {m.content}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Select a conversation.</p>
        )}
      </Card>
    </div>
  );
}
