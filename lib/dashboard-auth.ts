import { isPlatformAdmin } from "./rbac";
import { getCurrentUser } from "./session";
import { getProfileById, seedDefaults, userCanAccessProject } from "./store";
import { bootstrapPrimaryAdmin } from "./auth";
import { jsonError } from "./utils";
import type { Profile } from "./types";

export async function requireDashboardUser(): Promise<
  { user: Profile } | { response: Response }
> {
  await seedDefaults();
  await bootstrapPrimaryAdmin();
  const user = await getCurrentUser();
  if (!user) return { response: jsonError("Unauthorized", 401) };
  return { user };
}

export async function requireAdmin(): Promise<{ user: Profile } | { response: Response }> {
  const auth = await requireDashboardUser();
  if ("response" in auth) return auth;
  if (!isPlatformAdmin(auth.user)) return { response: jsonError("Forbidden", 403) };
  return auth;
}

export async function requirePlatformAdmin(): Promise<{ user: Profile } | { response: Response }> {
  return requireAdmin();
}

export async function requireProjectAccess(userId: string, projectId: string) {
  const user = await getProfileById(userId);
  if (user && isPlatformAdmin(user)) return;
  const ok = await userCanAccessProject(userId, projectId);
  if (!ok) throw Object.assign(new Error("Forbidden"), { status: 403 });
}
