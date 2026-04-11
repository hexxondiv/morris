export type StorageProvider = "s3" | "r2";

export type ResolvedStorageEnv = {
  provider: StorageProvider;
  bucket: string;
  region: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
};

export type UploadPublicObjectInput = {
  /** Object key inside the configured bucket (no leading slash), e.g. `images/cases/abc.jpg`. */
  objectKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

export type UploadPublicObjectResult = {
  objectKey: string;
  publicUrl: string;
};
