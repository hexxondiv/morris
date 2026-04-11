import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * POST /api/cases/upload
 * Handles multiple image uploads for case reports
 * Validates file size (max 2MB) and type (images only)
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate all files before uploading
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

    // Upload files to Supabase Storage
    const uploadedFiles: Array<{
      url: string;
      name: string;
      size: number;
      mimeType: string;
    }> = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `cases/${fileName}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from("images")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}`, details: error.message },
          { status: 500 }
        );
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("images").getPublicUrl(filePath);

      uploadedFiles.push({
        url: publicUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });
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
