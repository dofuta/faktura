import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { buildAuthUrl } from "@/server/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/google/callback`;
  const state = randomBytes(16).toString("hex");

  const store = await cookies();
  store.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(await buildAuthUrl(redirectUri, state));
}
