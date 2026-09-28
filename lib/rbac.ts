import { getEnv } from "./env";
import type { Profile, UserRole } from "./types";

export const ADMIN_USER_ID_DEFAULT = "9b5e2c3b-5f8e-495d-a4e0-24abcb952072";
export const ADMIN_EMAIL_DEFAULT = "riyadsarkar1243@gmail.com";

export function isPlatformAdminIdentity(userId: string, email: string): boolean {
  const env = getEnv();
  const id = userId.trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  if (id && id === ADMIN_USER_ID_DEFAULT.toLowerCase()) return true;
  if (mail && mail === ADMIN_EMAIL_DEFAULT.toLowerCase()) return true;
  if (env.ADMIN_USER_ID && id === env.ADMIN_USER_ID.trim().toLowerCase()) return true;
  if (env.ADMIN_EMAIL && mail === env.ADMIN_EMAIL.trim().toLowerCase()) return true;
  return false;
}

export function isPlatformAdmin(
  user: Pick<Profile, "id" | "email" | "role"> | UserRole | null | undefined,
): boolean {
  if (!user) return false;
  if (typeof user === "string") return user === "owner" || user === "admin";
  if (isPlatformAdminIdentity(user.id, user.email)) return true;
  return false;
}

export function roleForIdentity(userId: string, email: string, fallback: UserRole = "member"): UserRole {
  if (isPlatformAdminIdentity(userId, email)) return "owner";
  if (fallback === "owner") return "member";
  return fallback;
}

export function roleForEmail(email: string, adminEmail: string): UserRole {
  if (isPlatformAdminIdentity("", email)) return "owner";
  if (email.trim().toLowerCase() === adminEmail.trim().toLowerCase()) return "owner";
  return "member";
}

export function publicProfile(user: Profile) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    isAdmin: isPlatformAdmin(user),
  };
}
