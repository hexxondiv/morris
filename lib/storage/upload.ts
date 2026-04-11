import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getResolvedStorageEnv } from "./config";
import { getS3CompatibleClient } from "./s3-client";
import { publicObjectUrl } from "./public-url";
import type { UploadPublicObjectInput, UploadPublicObjectResult } from "./types";

/**
 * Server-side upload to the configured S3-compatible bucket. Caller must enforce authz.
 * Public readability is expected via CDN / bucket policy on `S3_PUBLIC_BASE_URL`, not object ACLs.
 */
export async function uploadPublicObject(
  input: UploadPublicObjectInput
): Promise<UploadPublicObjectResult> {
  const env = getResolvedStorageEnv();
  const client = getS3CompatibleClient(env);

  await client.send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: input.objectKey,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "public, max-age=31536000, immutable",
    })
  );

  return {
    objectKey: input.objectKey,
    publicUrl: publicObjectUrl(env.publicBaseUrl, input.objectKey),
  };
}
