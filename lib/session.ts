import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv, isSupabaseBrowserConfigured } from "./env";
import { publicProfile } from "./rbac";
import { getProfileById, seedDefaults } from "./store";
import { getSupabaseAuthUser } from "./supabase/session";
import { syncAuthenticatedProfile } from "./auth";
import type { Profile, SessionPayload } from "./types";

const COOKIE = "nexus_session";

function secretKey() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { sub: user.id, email: user.email, role: user.role };
}

export async function getCurrentUser(): Promise<Profile | null> {
  await seedDefaults();
  if (isSupabaseBrowserConfigured()) {
    const authUser = await getSupabaseAuthUser();
    if (authUser) return syncAuthenticatedProfile(authUser);
  }
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  return getProfileById(session.sub);
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function sessionUserPayload(user: Profile) {
  return publicProfile(user);
}
