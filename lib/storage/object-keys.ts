const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

/**
 * Normalizes a client-supplied folder prefix to a single path segment (legacy `images` bucket paths).
 */
export function sanitizeFolderPrefix(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed.includes("..") || trimmed.includes("/")) return null;
  if (!SAFE_SEGMENT.test(trimmed)) return null;
  return trimmed;
}

/**
 * Canonical key layout under `public/uploads/`:
 * - Project / generic uploads: `images/{folder}/{timestamp}.{ext}`
 * - Case evidence: `images/cases/{timestamp}-{rand}.{ext}`
 * - Avatars: `images/avatars/{userId}/{timestamp}.{ext}`
 */
export function buildImagesObjectKey(folder: string | null, fileName: string): string {
  const prefix = folder ? `images/${folder}` : "images/misc";
  const name = fileName.replace(/^\/+/, "");
  return `${prefix}/${name}`;
}
