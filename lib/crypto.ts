import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getEnv } from "./env";

const KEY_BYTES = 24;

export function generateId(prefix?: string): string {
  const id = randomBytes(16).toString("hex");
  return prefix ? `${prefix}_${id}` : id;
}

export function generateApiKey(env: "live" | "test" = "live"): { raw: string; prefix: string } {
  const secret = randomBytes(KEY_BYTES).toString("base64url");
  const raw = `uag_${env}_${secret}`;
  return { raw, prefix: raw.slice(0, 16) };
}

export function hashApiKey(raw: string): string {
  const secret = getEnv().API_KEY_HASH_SECRET;
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
