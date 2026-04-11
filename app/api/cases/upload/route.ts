import { NextResponse } from "next/server";
import { buildImagesObjectKey, uploadPublicObject } from "@/lib/storage";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * POST /api/cases/upload
 * Handles multiple image uploads for case reports (public; no session required).
 *
 * **Transactional note (workstream 06):** Objects are committed to object storage here; the
 * caller then submits `/api/cases/create` which persists `case_files.file_url` in a Prisma
 * `$transaction`. If the case create fails after a successful upload, storage objects may be
 * orphaned until a cleanup job or workstream `08` backfill reconciles them.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const validationErrors: string[] = [];
    files.forEach((file, index) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        validationErrors.push(
          `File ${index + 1} (${file.name}): Invalid file type. Only images are allowed.`
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(
          `File ${index + 1} (${file.name}): File size exceeds 2MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB).`
        );
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "File validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    const uploadedFiles: Array<{
      url: string;
      name: string;
      size: number;
      mimeType: string;
    }> = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop() || "bin";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const objectKey = buildImagesObjectKey("cases", fileName);

      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        const { publicUrl } = await uploadPublicObject({
          objectKey,
          body: buffer,
          contentType: file.type,
        });

        uploadedFiles.push({
          url: publicUrl,
          name: file.name,
          size: file.size,
          mimeType: file.type,
        });
      } catch (e) {
        console.error("Error uploading file:", e);
        return NextResponse.json(
          {
            error: `Failed to upload ${file.name}`,
            details: e instanceof Error ? e.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message: "Files uploaded successfully",
        files: uploadedFiles,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error uploading files:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during file upload" },
      { status: 500 }
    );
  }
}
