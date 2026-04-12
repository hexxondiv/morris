/**
 * Public URL path for a file stored at `public/uploads/{objectKey}`.
 * Next.js serves `public/` at the site root, so `/uploads/...` resolves correctly.
 */
export function publicUploadUrl(objectKey: string): string {
  const key = objectKey.replace(/^\/+/, "").replace(/\/+/g, "/");
  return `/uploads/${key}`;
}
