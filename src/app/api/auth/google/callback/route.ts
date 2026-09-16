import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { notify, WELCOME_NOTIFICATION } from "@/lib/notifications";
import {
  GOOGLE_STATE_COOKIE,
  exchangeCodeForProfile,
  getGoogleConfig,
  getGoogleRedirectUri,
  type GoogleProfile,
} from "@/lib/google-oauth";

function readSavedState(raw: string | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.state === "string" && typeof parsed.codeVerifier === "string"
      ? (parsed as { state: string; codeVerifier: string })
      : null;
  } catch {
    return null;
  }
}

/**
 * Google IDs are the primary link. Falling back to email is safe because
 * Google has verified it, and only Google sign-in ever sets User.email.
 */
async function findOrCreateGoogleUser(profile: GoogleProfile & { email: string }) {
  const byGoogleId = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (byGoogleId) return { user: byGoogleId, isNew: false };

  const byEmail = await db.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    const user = await db.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.sub },
    });
    return { user, isNew: false };
  }

  const user = await db.user.create({
    data: {
      googleId: profile.sub,
      email: profile.email,
      displayName: profile.name?.trim() || profile.email.split("@")[0],
    },
  });
  await notify(user.id, WELCOME_NOTIFICATION);
  return { user, isNew: true };
}

export async function GET(request: NextRequest) {
  const config = getGoogleConfig();
  if (!config) {
    redirect("/login?error=google_unconfigured");
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  const cookieStore = await cookies();
  const saved = readSavedState(cookieStore.get(GOOGLE_STATE_COOKIE)?.value);
  cookieStore.delete(GOOGLE_STATE_COOKIE);

  // `error` is set when the user cancels on Google's consent screen.
  if (params.get("error") || !code || !state || !saved || saved.state !== state) {
    redirect("/login?error=google_failed");
  }

  let profile: GoogleProfile | null = null;
  try {
    profile = await exchangeCodeForProfile({
      code,
      codeVerifier: saved.codeVerifier,
      redirectUri: getGoogleRedirectUri(request.url),
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
  } catch (err) {
    console.error("Google sign-in failed:", err);
  }

  if (!profile) {
    redirect("/login?error=google_failed");
  }
  if (!profile.email || !profile.emailVerified) {
    redirect("/login?error=google_email_unverified");
  }

  const { user, isNew } = await findOrCreateGoogleUser({ ...profile, email: profile.email });
  if (user.suspendedAt) {
    redirect("/login?error=suspended");
  }
  await createSession(user.id);
  // Google accounts have no phone number yet; new ones add and verify it first.
  redirect(isNew ? "/account/verify-phone" : "/");
}
