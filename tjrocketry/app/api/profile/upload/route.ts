import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ion_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and get user ID
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!profileRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop();
    const filename = `${ionId}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");
    const filepath = path.join(uploadDir, filename);

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(filepath, buffer);

    const pfpUrl = `/uploads/${filename}`;

    // Update user in DB
    await prisma.user.update({
      where: { ionId },
      data: { pfpUrl },
    });

    return NextResponse.json({ success: true, pfpUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
