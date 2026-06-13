import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // In a real app, you might want to call Ion API to verify the token or get user info
  // For now, we just assume if the token exists, they are authenticated
  return NextResponse.json({ authenticated: true });
}
