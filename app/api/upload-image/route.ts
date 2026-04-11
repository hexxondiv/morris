import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { buildImagesObjectKey, sanitizeFolderPrefix, uploadPublicObject } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return auth.response;
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const path = formData.get("path") as string;

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const fileExt = file.name.split(".").pop() || "bin";
  const folder = sanitizeFolderPrefix(path);
  const fileName = `${Date.now()}.${fileExt}`;
  const objectKey = buildImagesObjectKey(folder, fileName);

  if (objectKey.length > 200) {
    return NextResponse.json({ error: "File path is too long" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await uploadPublicObject({
      objectKey,
      body: buffer,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ url: publicUrl, path: objectKey });
  } catch (e) {
    console.error("upload-image:", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
