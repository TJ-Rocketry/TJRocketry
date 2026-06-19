import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!profileRes.ok) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const user = await prisma.user.findUnique({
      where: { ionId },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        ionId: user.ionId,
        name: user.name,
        username: user.username,
        classYear: user.classYear,
        roles: user.roles,
        pfpUrl: user.pfpUrl,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
