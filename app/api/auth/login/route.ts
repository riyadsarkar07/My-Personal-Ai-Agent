import { authenticateUser, bootstrapPrimaryAdmin, syncAuthenticatedProfile } from "@/lib/auth";
import { isSupabaseBrowserConfigured } from "@/lib/env";
import { loginSchema } from "@/lib/schemas";
import { sessionUserPayload, setSessionCookie, signSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/session";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    await bootstrapPrimaryAdmin();
    const raw = await readJsonLimited<unknown>(request);
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) return jsonError("Invalid credentials payload", 422);
    const email = parsed.data.email.trim().toLowerCase();
    if (isSupabaseBrowserConfigured()) {
      const client = await createUserClient();
      if (!client) return jsonError("Authentication is not configured", 503);
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: parsed.data.password,
      });
      if (error || !data.user?.email) return jsonError("Invalid email or password", 401);
      const user = await syncAuthenticatedProfile(data.user);
      if (!user) return jsonError("Unable to load profile", 401);
      return jsonOk(sessionUserPayload(user));
    }
    const user = await authenticateUser(email, parsed.data.password);
    if (!user) return jsonError("Invalid email or password", 401);
    const token = await signSession({ sub: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);
    return jsonOk(sessionUserPayload(user));
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(error instanceof Error ? error.message : "Login failed", status);
  }
}
