import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeAndStoreToken } from "@/server/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get("google_oauth_state")?.value;
  store.delete("google_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/settings?drive=error`);
  }

  try {
    await exchangeCodeAndStoreToken(code, `${origin}/api/google/callback`);
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return NextResponse.redirect(`${origin}/settings?drive=error`);
  }

  return NextResponse.redirect(`${origin}/settings?drive=connected`);
}
