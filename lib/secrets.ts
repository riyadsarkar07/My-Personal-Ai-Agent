import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { getEnv } from "./env";

function encryptionKey(): Buffer {
  const secret = getEnv().CREDENTIAL_ENCRYPTION_KEY || getEnv().API_KEY_HASH_SECRET;
  return scryptSync(secret, "nexus-provider-creds-v1", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

export function secretPrefix(raw: string): string {
  if (raw.length <= 10) return `${raw.slice(0, 4)}…`;
  return `${raw.slice(0, 8)}…${raw.slice(-4)}`;
}
