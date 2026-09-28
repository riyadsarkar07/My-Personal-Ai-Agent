import { registerUser } from "@/lib/auth";
import { registerSchema } from "@/lib/schemas";
import { setSessionCookie, signSession } from "@/lib/session";
import { jsonError, jsonOk, readJsonLimited } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const raw = await readJsonLimited<unknown>(request);
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) return jsonError("Invalid registration payload", 422);
    const user = await registerUser({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
    });
    const token = await signSession({ sub: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);
    return jsonOk(
      { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      201,
    );
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(error instanceof Error ? error.message : "Registration failed", status);
  }
}
