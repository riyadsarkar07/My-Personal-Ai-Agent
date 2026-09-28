"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { relativeTime } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
};

type AuditRow = {
  id: string;
  action: string;
  resource: string;
  created_at: string;
  user_id: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  const load = useCallback(() => {
    void Promise.all([fetch("/api/dashboard/users"), fetch("/api/dashboard/audit")]).then(async ([u, a]) => {
      setUsers((await u.json()).data ?? []);
      setAudit((await a.json()).data ?? []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeTable("profiles", load);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted">Platform admin view. Ordinary members never see this page.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-sm text-muted">{user.email}</p>
                <p className="mt-1 font-mono text-xs text-muted">{user.id}</p>
              </div>
              <Badge tone={user.isAdmin ? "accent" : "neutral"}>{user.isAdmin ? "admin" : user.role}</Badge>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-3 font-medium">Recent audit</h2>
        <div className="space-y-2 text-sm">
          {audit.slice(0, 20).map((row) => (
            <div key={row.id} className="flex justify-between gap-3">
              <span>
                {row.action} <span className="text-muted">{row.resource}</span>
              </span>
              <span className="text-muted">{relativeTime(row.created_at)}</span>
            </div>
          ))}
          {audit.length === 0 ? <p className="text-muted">No audit events yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
