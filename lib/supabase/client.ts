import { createBrowserClient } from "@supabase/ssr";
import { getEnv, isSupabaseConfigured } from "../env";

export function createBrowserSupabase() {
  if (!isSupabaseConfigured()) return null;
  const env = getEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
