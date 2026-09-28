import { bootstrapPrimaryAdmin, registerUser, syncAuthenticatedProfile } from "@/lib/auth";
import { isSupabaseBrowserConfigured } from "@/lib/env";
import { registerSchema } from "@/lib/schemas";
import { sessionUserPayload, setSessionCookie, signSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/session";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    await bootstrapPrimaryAdmin();
    const raw = await readJsonLimited<unknown>(request);
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) return jsonError("Invalid registration payload", 422);
    const email = parsed.data.email.trim().toLowerCase();
    const user = await registerUser({
      email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
    });
    if (isSupabaseBrowserConfigured()) {
      const client = await createUserClient();
      if (!client) return jsonError("Authentication is not configured", 503);
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: parsed.data.password,
      });
      if (error || !data.user?.email) return jsonError(error?.message || "Unable to start session", 401);
      const synced = (await syncAuthenticatedProfile(data.user)) ?? user;
      return jsonOk(sessionUserPayload(synced), 201);
    }
    const token = await signSession({ sub: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);
    return jsonOk(sessionUserPayload(user), 201);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(error instanceof Error ? error.message : "Registration failed", status);
  }
}
