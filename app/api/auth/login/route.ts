import { authenticateUser } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";
import { setSessionCookie, signSession } from "@/lib/session";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const raw = await readJsonLimited<unknown>(request);
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) return jsonError("Invalid credentials payload", 422);
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) return jsonError("Invalid email or password", 401);
    const token = await signSession({ sub: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);
    return jsonOk({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(error instanceof Error ? error.message : "Login failed", status);
  }
}
