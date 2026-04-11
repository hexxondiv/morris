import { S3Client } from "@aws-sdk/client-s3";
import type { ResolvedStorageEnv } from "./types";

let cached: { sig: string; client: S3Client } | null = null;

function clientSignature(env: ResolvedStorageEnv): string {
  return [
    env.bucket,
    env.region,
    env.endpoint ?? "",
    env.accessKeyId,
    env.secretAccessKey,
    env.forcePathStyle ? "1" : "0",
  ].join("|");
}

export function getS3CompatibleClient(env: ResolvedStorageEnv): S3Client {
  const sig = clientSignature(env);
  if (cached?.sig === sig) return cached.client;

  const client = new S3Client({
    region: env.region,
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    forcePathStyle: env.forcePathStyle,
  });
  cached = { sig, client };
  return client;
}
