import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureBucket, getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_EXT = /\.(jpe?g|jfif|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const looksLikeImage = (file.type.startsWith("image/") && file.type !== "image/svg+xml") || IMAGE_EXT.test(file.name);
    if (!looksLikeImage) {
      return NextResponse.json({ error: "That file isn't an image" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 15 MB" }, { status: 413 });
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

    await ensureBucket("profiles");
    const storage = getSupabaseAdmin().storage.from("profiles");
    const filename = `avatars/${user.ionId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await storage.upload(filename, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const pfpUrl = storage.getPublicUrl(filename).data.publicUrl;
    await db.update(users).set({ pfpUrl }).where(eq(users.id, user.id));
    return NextResponse.json({ success: true, pfpUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
