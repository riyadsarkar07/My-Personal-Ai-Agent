import { generateId, hashPassword, verifyPassword } from "./crypto";
import { getEnv, isSupabaseConfigured } from "./env";
import { isPlatformAdmin, roleForIdentity } from "./rbac";
import {
  createAuthUser,
  findAuthUserByEmail,
  findAuthUserById,
  listAuthUsers,
  selectPrimaryAdminAuthUser,
  signInAuthUser,
} from "./supabase/admin";
import {
  ensureOwnerWorkspace,
  getProfileByEmail,
  getProfileById,
  seedDefaults,
  syncAuthUserToProfile,
  updateProfileRole,
  upsertProfile,
} from "./store";
import { nowIso } from "./utils";
import type { Profile, UserRole } from "./types";

function authError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

async function promoteConfiguredAdmin(profile: Profile): Promise<Profile> {
  if (!isPlatformAdmin(profile)) return profile;
  if (profile.role === "owner") {
    await ensureOwnerWorkspace(profile);
    return profile;
  }
  const promoted = (await updateProfileRole(profile.id, "owner")) ?? { ...profile, role: "owner" as UserRole };
  await ensureOwnerWorkspace(promoted);
  return promoted;
}

export async function bootstrapPrimaryAdmin(): Promise<Profile | null> {
  await seedDefaults();
  const env = getEnv();
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const adminUserId = env.ADMIN_USER_ID.trim();

  if (isSupabaseConfigured()) {
    const authUsers = await listAuthUsers();
    const selected = selectPrimaryAdminAuthUser(authUsers, adminEmail, adminUserId);
    if (selected?.email) {
      const metadata = selected.user_metadata as { full_name?: string; fullName?: string } | undefined;
      const profile = await syncAuthUserToProfile({
        id: selected.id,
        email: selected.email,
        fullName: metadata?.full_name || metadata?.fullName || selected.email.split("@")[0],
        role: "owner",
      });
      await ensureOwnerWorkspace(profile);
      return profile;
    }
  }

  if (adminUserId) {
    const byId = await getProfileById(adminUserId);
    if (byId) return promoteConfiguredAdmin(byId);
  }

  if (adminEmail) {
    const byEmail = await getProfileByEmail(adminEmail);
    if (byEmail) return promoteConfiguredAdmin(byEmail);
  }

  return null;
}

async function authenticateLocal(email: string, password: string): Promise<Profile | null> {
  const profile = await getProfileByEmail(email);
  if (!profile?.password_hash) return null;
  if (!verifyPassword(password, profile.password_hash)) return null;
  return promoteConfiguredAdmin(profile);
}

export async function authenticateUser(email: string, password: string): Promise<Profile | null> {
  await seedDefaults();
  const normalized = email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    const authUser = await signInAuthUser(normalized, password);
    if (authUser?.email) {
      const metadata = authUser.user_metadata as { full_name?: string; fullName?: string } | undefined;
      const profile = await syncAuthUserToProfile({
        id: authUser.id,
        email: authUser.email,
        fullName: metadata?.full_name || metadata?.fullName,
      });
      return promoteConfiguredAdmin(profile);
    }

    const existingAuth = await findAuthUserByEmail(normalized);
    if (existingAuth) return null;

    const local = await authenticateLocal(normalized, password);
    if (local) return local;
    return null;
  }

  return authenticateLocal(normalized, password);
}

export async function registerUser(input: { email: string; password: string; fullName: string }): Promise<Profile> {
  await seedDefaults();
  const email = input.email.trim().toLowerCase();
  const existing = await getProfileByEmail(email);
  if (existing) throw authError("An account with that email already exists", 409);

  if (isSupabaseConfigured()) {
    const already = await findAuthUserByEmail(email);
    if (already) throw authError("An account with that email already exists", 409);
    const authUser = await createAuthUser(input);
    const profile = await syncAuthUserToProfile({
      id: authUser.id,
      email: authUser.email || email,
      fullName: input.fullName,
      role: roleForIdentity(authUser.id, email, "member"),
    });
    return promoteConfiguredAdmin(profile);
  }

  const id = generateId("usr");
  const profile: Profile = {
    id,
    email,
    full_name: input.fullName,
    role: roleForIdentity(id, email, "member"),
    password_hash: hashPassword(input.password),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const created = await upsertProfile(profile);
  return promoteConfiguredAdmin(created);
}

export async function resolveSessionProfile(userId: string): Promise<Profile | null> {
  await seedDefaults();
  let profile = await getProfileById(userId);
  if (!profile && isSupabaseConfigured()) {
    const authUser = await findAuthUserById(userId);
    if (authUser?.email) {
      const metadata = authUser.user_metadata as { full_name?: string; fullName?: string } | undefined;
      profile = await syncAuthUserToProfile({
        id: authUser.id,
        email: authUser.email,
        fullName: metadata?.full_name || metadata?.fullName,
      });
    }
  }
  if (!profile) return null;
  return promoteConfiguredAdmin(profile);
}

export async function syncAuthenticatedProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<Profile | null> {
  if (!user.email) return null;
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.fullName === "string"
        ? user.user_metadata.fullName
        : null;
  const profile = await syncAuthUserToProfile({
    id: user.id,
    email: user.email,
    fullName: metadataName ?? undefined,
    role: roleForIdentity(user.id, user.email, "member"),
  });
  return promoteConfiguredAdmin(profile);
}

export { isPlatformAdmin };
