import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv, isSupabaseBrowserConfigured } from "../env";
import type { User } from "@supabase/supabase-js";

export async function createUserClient() {
  if (!isSupabaseBrowserConfigured()) return null;
  const env = getEnv();
  const jar = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set(name, value, options);
          });
        } catch {
          // Server Components cannot always persist refreshed cookies; middleware does.
        }
      },
    },
  });
}

export async function getSupabaseAuthUser(): Promise<User | null> {
  const client = await createUserClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}
