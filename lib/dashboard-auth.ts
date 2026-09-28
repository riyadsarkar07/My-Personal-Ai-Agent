import { getSession } from "./session";
import { getProfileById, seedDefaults, userCanAccessProject } from "./store";
import { jsonError } from "./utils";
import type { Profile } from "./types";

export async function requireDashboardUser(): Promise<
  { user: Profile } | { response: Response }
> {
  await seedDefaults();
  const session = await getSession();
  if (!session) return { response: jsonError("Unauthorized", 401) };
  const user = await getProfileById(session.sub);
  if (!user) return { response: jsonError("Unauthorized", 401) };
  return { user };
}

export async function requireProjectAccess(userId: string, projectId: string) {
  const ok = await userCanAccessProject(userId, projectId);
  if (!ok) throw Object.assign(new Error("Forbidden"), { status: 403 });
}
