"use client";

import { useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function useRealtimeTable(table: string, onChange: () => void) {
  useEffect(() => {
    const client = createBrowserSupabase();
    if (!client) return;
    const channel = client
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        onChange();
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [table, onChange]);
}
