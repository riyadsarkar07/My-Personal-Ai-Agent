import { generateId, hashPassword, verifyPassword } from "./crypto";
import { getEnv } from "./env";
import { getProfileByEmail, seedDefaults, upsertProfile } from "./store";
import { nowIso } from "./utils";
import type { Profile } from "./types";

export async function authenticateUser(email: string, password: string): Promise<Profile | null> {
  await seedDefaults();
  const profile = await getProfileByEmail(email);
  if (!profile?.password_hash) return null;
  if (!verifyPassword(password, profile.password_hash)) return null;
  return profile;
}

export async function registerUser(input: { email: string; password: string; fullName: string }): Promise<Profile> {
  await seedDefaults();
  const existing = await getProfileByEmail(input.email);
  if (existing) {
    throw Object.assign(new Error("An account with that email already exists"), { status: 409 });
  }
  const env = getEnv();
  const isFirstAdmin = input.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  const profile: Profile = {
    id: generateId("usr"),
    email: input.email.toLowerCase(),
    full_name: input.fullName,
    role: isFirstAdmin ? "owner" : "member",
    password_hash: hashPassword(input.password),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  return upsertProfile(profile);
}
