import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  buildGoogleAuthUrl,
  createPkcePair,
  getGoogleConfig,
  getGoogleRedirectUri,
} from "@/lib/google-oauth";

/** Starts Google sign-in: stores state + PKCE verifier, then redirects to Google. */
export async function GET(request: NextRequest) {
  const config = getGoogleConfig();
  if (!config) {
    redirect("/login?error=google_unconfigured");
  }

  const state = randomBytes(16).toString("base64url");
  const { codeVerifier, codeChallenge } = createPkcePair();

  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  redirect(
    buildGoogleAuthUrl({
      clientId: config.clientId,
      redirectUri: getGoogleRedirectUri(request.url),
      state,
      codeChallenge,
    })
  );
}
