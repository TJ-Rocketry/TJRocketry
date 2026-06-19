import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("ion_access_token");
  cookieStore.delete("ion_refresh_token");

  return NextResponse.json({ success: true });
}
