import { client, redirect_uri } from "@/lib/ion-oauth";
import { NextResponse } from "next/server";

export async function GET() {
  const authorizationUri = client.authorizeURL({
    redirect_uri: redirect_uri,
    scope: "read",
    // state: 'random-string', // Optional but recommended
  });

  return NextResponse.redirect(authorizationUri);
}
