import type { Profile, UserRole } from "./types";

export function isPlatformAdmin(user: Pick<Profile, "role"> | UserRole | null | undefined): boolean {
  const role = typeof user === "string" ? user : user?.role;
  return role === "owner" || role === "admin";
}

export function roleForEmail(email: string, adminEmail: string): UserRole {
  if (email.trim().toLowerCase() === adminEmail.trim().toLowerCase()) return "owner";
  return "member";
}
