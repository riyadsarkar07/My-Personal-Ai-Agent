import { createBrowserClient } from "@supabase/ssr";
import { getEnv, isSupabaseBrowserConfigured } from "../env";

export function createBrowserSupabase() {
  if (!isSupabaseBrowserConfigured()) return null;
  const env = getEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
