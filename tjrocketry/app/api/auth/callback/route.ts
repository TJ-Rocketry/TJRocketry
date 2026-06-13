import { client, redirect_uri } from "@/lib/ion-oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

    // Extract token details
    const token = accessToken.token;
    
    // Set cookie with access token
    const cookieStore = await cookies();
    cookieStore.set("ion_access_token", token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: token.expires_in as number || 3600,
      path: "/",
    });

    // Optionally set refresh token too
    if (token.refresh_token) {
        cookieStore.set("ion_refresh_token", token.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });
    }

    // Redirect to home or where the user was
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Access Token Error", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
