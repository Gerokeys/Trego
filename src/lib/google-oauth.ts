import "server-only";
import { createHash, randomBytes } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { SITE_URL } from "./site";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

/** Short-lived cookie holding the OAuth state + PKCE verifier between redirects. */
export const GOOGLE_STATE_COOKIE = "google_oauth";

export type GoogleProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

/** Returns null when Google sign-in isn't configured (no client ID/secret in env). */
export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * The callback Google redirects back to. It must match a URI registered on
 * the OAuth client character for character.
 *
 * Behind a proxy -- Railway, and most hosts -- the incoming request URL is the
 * container's internal address (localhost:3000), not the public one, so deriving
 * it from the request sends Google a redirect_uri that can never match.
 * NEXT_PUBLIC_SITE_URL is the public origin, so prefer it when set, and let
 * GOOGLE_REDIRECT_URI override both when the callback lives somewhere else.
 */
export function getGoogleRedirectUri(requestUrl: string) {
  const override = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (override) return override;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() ? SITE_URL : requestUrl;
  return new URL("/api/auth/google/callback", base).toString();
}

export function createPkcePair() {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Exchanges the authorization code and verifies the returned ID token. */
export async function exchangeCodeForProfile(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      code_verifier: params.codeVerifier,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) {
    throw new Error("Google token response had no id_token");
  }

  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: params.clientId,
  });
  if (!payload.sub) {
    throw new Error("Google ID token had no subject");
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}
