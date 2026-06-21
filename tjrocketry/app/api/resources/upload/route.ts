import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resourceFiles } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "resources";

async function ensureBucket() {
  const { data: buckets } = await getSupabaseAdmin().storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await getSupabaseAdmin().storage.createBucket(BUCKET, { public: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "upload route reachable" });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const parentId = formData.get("parentId") ? Number(formData.get("parentId")) : null;
    const category = (formData.get("category") as string) || "digital_files";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const isAdmin = user.roles.includes("admin");
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (!isAdmin && totalBytes > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Total upload size exceeds 25 MB limit" }, { status: 413 });
    }

    await ensureBucket();

    const results = await Promise.all(files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length === 0) return null;
      const ext = file.name.split(".").pop() || "bin";
      const storagePath = `digital_files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await getSupabaseAdmin().storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return null;
      }

      const { data: publicUrlData } = getSupabaseAdmin().storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const [record] = await db
        .insert(resourceFiles)
        .values({
          name: file.name,
          fileUrl: publicUrlData.publicUrl,
          fileSize: buffer.length,
          category,
          parentId,
          uploadedById: user.id,
        })
        .returning();

      return record;
    }));

    const uploaded = results.filter(Boolean);
    return NextResponse.json({ success: true, files: uploaded });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
