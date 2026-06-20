import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

const ion_client_id = process.env.ION_CLIENT_ID || process.env.NEXT_CLIENT_ID;
const ion_client_secret = process.env.ION_CLIENT_SECRET || process.env.NEXT_CLIENT_SECRET;
const ion_redirect_uri = process.env.ION_REDIRECT_URI;

function extractUsername(email: string | null): string | null {
  if (!email) return null;
  return email.split("@")[0];
}

function extractClassYear(email: string | null): string | null {
  if (!email) return null;
  const match = email.match(/^(\d{4})/);
  return match ? match[1] : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code || !ion_client_id || !ion_client_secret || !ion_redirect_uri) {
    return NextResponse.json({ error: "Missing code or OAuth config" }, { status: 400 });
  }

  try {
    const tokenRes = await fetch("https://ion.tjhsst.edu/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: ion_client_id,
        client_secret: ion_client_secret,
        redirect_uri: ion_redirect_uri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const token = await tokenRes.json();

    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    if (!profileRes.ok) {
      throw new Error("Failed to fetch Ion profile");
    }

    const profileData = await profileRes.json();
    const ionId = String(profileData.id);
    const email = profileData.tj_email || profileData.email || null;
    const name = profileData.full_name || profileData.first_name || null;
    const username = extractUsername(email);
    const classYear = extractClassYear(email);

    const isAutoAdmin = username === "2028efeldman";

    const { data: existing } = await supabase
      .from('User')
      .select("id, roles")
      .eq("ionId", ionId)
      .maybeSingle();

    let userId: number;
    let finalRoles: string[];

    if (existing) {
      userId = existing.id;
      finalRoles = isAutoAdmin && !existing.roles.includes("admin")
        ? [...existing.roles, "admin"]
        : existing.roles;

      await supabase
        .from('User')
        .update({ email, name, username, classYear, roles: finalRoles })
        .eq("id", userId);
    } else {
      finalRoles = isAutoAdmin ? ["user", "admin"] : ["user"];

      const { data: inserted, error: insertError } = await supabase
        .from('User')
        .insert({ ionId, email, name, username, classYear, roles: finalRoles })
        .select("id, roles")
        .single();

      if (insertError) throw new Error(`Failed to insert user: ${insertError.message}`);
      if (!inserted) throw new Error("Failed to insert user: no data returned");
      userId = inserted.id;
    }

    const cookieStore = await cookies();
    cookieStore.set("ion_access_token", token.access_token as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: (token.expires_in as number) || 3600,
      path: "/",
    });

    if (token.refresh_token) {
      cookieStore.set("ion_refresh_token", token.refresh_token as string, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    return NextResponse.redirect(new URL("/home", request.url));
  } catch (error) {
    console.error("Access Token Error", error, "cause:", error instanceof Error && 'cause' in error ? error.cause : "none");
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
