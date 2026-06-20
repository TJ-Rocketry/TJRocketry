import { NextResponse } from "next/server";

const ion_client_id = process.env.ION_CLIENT_ID || process.env.NEXT_CLIENT_ID;
const ion_redirect_uri = process.env.ION_REDIRECT_URI;

export async function GET() {
  if (!ion_client_id || !ion_redirect_uri) {
    return NextResponse.json({ error: "Missing OAuth config" }, { status: 500 });
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: ion_client_id,
    redirect_uri: ion_redirect_uri,
    scope: "read",
  });

  return NextResponse.redirect(`https://ion.tjhsst.edu/oauth/authorize?${params}`);
}
