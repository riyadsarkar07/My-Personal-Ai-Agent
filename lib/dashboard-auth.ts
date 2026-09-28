import { bootstrapPrimaryAdmin, isPlatformAdmin, resolveSessionProfile } from "./auth";
import { getSession } from "./session";
import { seedDefaults, userCanAccessProject } from "./store";
import { jsonError } from "./utils";
import type { Profile } from "./types";

export async function requireDashboardUser(): Promise<
  { user: Profile } | { response: Response }
> {
  await seedDefaults();
  await bootstrapPrimaryAdmin();
  const session = await getSession();
  if (!session) return { response: jsonError("Unauthorized", 401) };
  const user = await resolveSessionProfile(session.sub);
  if (!user) return { response: jsonError("Unauthorized", 401) };
  return { user };
}

export async function requirePlatformAdmin(): Promise<
  { user: Profile } | { response: Response }
> {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth;
  if (!isPlatformAdmin(auth.user)) return { response: jsonError("Forbidden", 403) };
  return auth;
}

export async function requireProjectAccess(userId: string, projectId: string) {
  const ok = await userCanAccessProject(userId, projectId);
  if (!ok) throw Object.assign(new Error("Forbidden"), { status: 403 });
}
