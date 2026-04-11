import type { ResolvedStorageEnv, StorageProvider } from "./types";

function parseProvider(raw: string | undefined): StorageProvider {
  const v = (raw || "s3").toLowerCase();
  if (v === "r2") return "r2";
  return "s3";
}

export function getResolvedStorageEnv(): ResolvedStorageEnv {
  const provider = parseProvider(process.env.STORAGE_PROVIDER);
  const bucket = process.env.S3_BUCKET?.trim();
  const region = (process.env.S3_REGION || "auto").trim();
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");

  if (!bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error(
      "Storage is not configured: set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_PUBLIC_BASE_URL (see docs/environment-reference.md)."
    );
  }

  return {
    provider,
    bucket,
    region,
    endpoint: endpoint || undefined,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
}
