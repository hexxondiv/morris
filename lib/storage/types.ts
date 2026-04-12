export type UploadPublicObjectInput = {
  /** Relative path under `public/uploads/` (no leading slash), e.g. `images/cases/abc.jpg`. */
  objectKey: string;
  body: Buffer;
  /** Recorded for API compatibility; local writes do not attach HTTP metadata to files. */
  contentType: string;
};

export type UploadPublicObjectResult = {
  objectKey: string;
  /** Same-origin URL path, e.g. `/uploads/images/cases/abc.jpg`. */
  publicUrl: string;
};
