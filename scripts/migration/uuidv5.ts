/**
 * Deterministic UUID v5 (RFC 4122) for stable legacy → target primary keys.
 * Namespace UUID is fixed for this repository; document in runbook — changing it breaks idempotency.
 */
import { createHash } from "node:crypto";

/** Namespace reserved for Clerk / legacy `profiles.id` → Prisma `users.id`. */
export const LEGACY_USER_NAMESPACE = "a93dbe40-0008-5000-8000-000000000001";

function parseUuid(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`Invalid namespace UUID: ${uuid}`);
  return Buffer.from(hex, "hex");
}

/**
 * UUID v5: SHA-1(namespace || name), then set version (5) and variant (RFC 4122).
 */
export function uuidV5(name: string, namespaceUuid: string = LEGACY_USER_NAMESPACE): string {
  const ns = parseUuid(namespaceUuid);
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function legacyProfileIdToUserId(legacyProfileId: string): string {
  return uuidV5(`clerk_profile_id:${legacyProfileId}`, LEGACY_USER_NAMESPACE);
}
