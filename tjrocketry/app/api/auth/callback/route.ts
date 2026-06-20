import { client, redirect_uri } from "@/lib/ion-oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

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

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const accessToken = await client.getToken({
      code,
      redirect_uri,
    });

    const token = accessToken.token;

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

    const [user] = await db
      .insert(users)
      .values({
        ionId,
        email,
        name,
        username,
        classYear,
        roles: isAutoAdmin ? ["user", "admin"] : ["user"],
      })
      .onConflictDoUpdate({
        target: users.ionId,
        set: { email, name, username, classYear },
      })
      .returning();

    if (isAutoAdmin && !user.roles.includes("admin")) {
      await db
        .update(users)
        .set({ roles: [...user.roles, "admin"] })
        .where(eq(users.id, user.id));
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
    console.error("Access Token Error", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
