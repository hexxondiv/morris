/**
 * Builds a browser-usable URL for an object stored with a public CDN or bucket website base.
 * `publicBaseUrl` must not include a trailing slash (normalized by callers).
 */
export function publicObjectUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const key = objectKey.replace(/^\/+/, "");
  return `${base}/${key}`;
}
