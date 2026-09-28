import { isSupabaseBrowserConfigured } from "@/lib/env";
import { clearSessionCookie } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/session";
import { jsonOk } from "@/lib/utils";

export async function POST() {
  if (isSupabaseBrowserConfigured()) {
    const client = await createUserClient();
    if (client) await client.auth.signOut();
  }
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
