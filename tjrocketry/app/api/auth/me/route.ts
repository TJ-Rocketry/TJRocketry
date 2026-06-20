import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

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
      signal: AbortSignal.timeout(10000),
    });

    if (!profileRes.ok) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const { data: user } = await supabase
      .from('User')
      .select("id, ionId, name, username, classYear, roles, pfpUrl")
      .eq("ionId", ionId)
      .maybeSingle();

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
