import { createClient, type User } from "@supabase/supabase-js";
import { getEnv } from "../env";
import { createServiceClient } from "./server";

export function createAuthClient() {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  if (!env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http")) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isEmailNotConfirmedError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = (error.code || "").toLowerCase();
  const message = (error.message || "").toLowerCase();
  return code === "email_not_confirmed" || message.includes("email not confirmed");
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const target = email.toLowerCase();
  const users = await listAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === target) ?? null;
}

export async function findAuthUserById(id: string): Promise<User | null> {
  const client = createServiceClient();
  if (!client || !id) return null;
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error || !data.user) return null;
  return data.user;
}

export async function listAuthUsers(maxPages = 10): Promise<User[]> {
  const client = createServiceClient();
  if (!client) return [];
  const perPage = 1000;
  const users: User[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) return users;
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
  }
  return users;
}

export function selectPrimaryAdminAuthUser<T extends { id: string; email?: string | null }>(
  users: T[],
  adminEmail: string,
  adminUserId = "",
): T | null {
  const email = adminEmail.toLowerCase();
  const id = adminUserId.trim();
  if (id) {
    const byId = users.find((user) => user.id === id);
    if (byId) return byId;
  }
  if (email) {
    const byEmail = users.find((user) => user.email?.toLowerCase() === email);
    if (byEmail) return byEmail;
  }
  if (users.length === 1) return users[0];
  return null;
}

export async function confirmAuthEmail(userId: string): Promise<void> {
  const client = createServiceClient();
  if (!client) return;
  await client.auth.admin.updateUserById(userId, { email_confirm: true });
}

export async function signInAuthUser(email: string, password: string): Promise<User | null> {
  const authClient = createAuthClient();
  if (!authClient) return null;
  const normalized = email.toLowerCase();
  const first = await authClient.auth.signInWithPassword({ email: normalized, password });
  if (first.data.user) return first.data.user;

  if (isEmailNotConfirmedError(first.error)) {
    const existing = await findAuthUserByEmail(normalized);
    if (!existing) return null;
    await confirmAuthEmail(existing.id);
    const retry = await authClient.auth.signInWithPassword({ email: normalized, password });
    if (retry.data.user) return retry.data.user;
  }
  return null;
}

export async function createAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<User> {
  const client = createServiceClient();
  if (!client) {
    throw Object.assign(new Error("Supabase is not configured"), { status: 500 });
  }
  const { data, error } = await client.auth.admin.createUser({
    email: input.email.toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) {
    const message = error?.message || "Unable to create account";
    const duplicate =
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("registered") ||
      message.toLowerCase().includes("exists");
    throw Object.assign(new Error(duplicate ? "An account with that email already exists" : message), {
      status: duplicate ? 409 : 400,
    });
  }
  return data.user;
}
