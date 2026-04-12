import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { publicUploadUrl } from "./public-url";
import type { UploadPublicObjectInput, UploadPublicObjectResult } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function resolvedFilePath(objectKey: string): string {
  const key = objectKey.replace(/^\/+/, "");
  if (!key || key.includes("..")) {
    throw new Error("Invalid object key");
  }
  const root = path.resolve(UPLOAD_ROOT);
  const full = path.resolve(root, key);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error("Invalid object key");
  }
  return full;
}

/**
 * Writes to `public/uploads/{objectKey}`. Caller must enforce authz.
 * Files are served statically at `/uploads/{objectKey}`.
 */
export async function uploadPublicObject(
  input: UploadPublicObjectInput
): Promise<UploadPublicObjectResult> {
  const filePath = resolvedFilePath(input.objectKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.body);

  return {
    objectKey: input.objectKey.replace(/^\/+/, ""),
    publicUrl: publicUploadUrl(input.objectKey),
  };
}
