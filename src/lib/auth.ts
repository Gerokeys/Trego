import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

async function getUserIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

/**
 * Returns the current user (with seller profile), or null if not logged in.
 * Cached per request: the header and the page both call it on every render.
 */
export const getCurrentUser = cache(async () => {
  const userId = await getUserIdFromSession();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { sellerProfile: true },
  });
  // Suspended accounts are treated as logged out everywhere.
  return user && !user.suspendedAt ? user : null;
});

/** Redirects to log in if there is no user. For pages and actions that need an account. */
export async function requireUser(returnTo = "/") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

/**
 * Selling, messaging, offers and checkout need a verified phone number, so
 * every party to a deal is reachable and fake accounts are harder to make.
 */
export async function requireVerifiedUser(returnTo: string) {
  const user = await requireUser(returnTo);
  if (!user.phoneVerifiedAt) {
    redirect(`/account/verify-phone?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

/** Admin pages 404 for everyone else rather than revealing they exist. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") {
    notFound();
  }
  return user;
}
