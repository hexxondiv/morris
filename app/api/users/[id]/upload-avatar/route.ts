import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/server";
import { buildImagesObjectKey, uploadPublicObject } from "@/lib/storage";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    if (auth.userId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const objectKey = buildImagesObjectKey(`avatars/${id}`, `${Date.now()}.${fileExt}`);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { publicUrl } = await uploadPublicObject({
      objectKey,
      body: buffer,
      contentType: file.type || "image/jpeg",
    });

    await prisma.user.update({
      where: { id },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({
      url: publicUrl,
      success: true,
      message: "Avatar updated successfully",
    });
  } catch (error: unknown) {
    console.error("upload-avatar:", error);
    return NextResponse.json(
      {
        error: "Failed to upload avatar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
