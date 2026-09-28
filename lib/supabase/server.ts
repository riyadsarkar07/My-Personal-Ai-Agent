import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv, isSupabaseConfigured } from "../env";

let cached: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;
  const env = getEnv();
  cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
