import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function checkAdminAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;

  if (!token) return false;

  try {
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return false;
    
    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const user = await prisma.user.findUnique({ where: { ionId } });
    if (!user || !user.roles.includes("admin")) return false;

    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" }
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, roles } = await request.json();
    
    if (!id || !Array.isArray(roles)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { roles },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
