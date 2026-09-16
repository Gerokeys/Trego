import Link from "next/link";
import { AuthDivider, GoogleSignInButton } from "@/components/google-sign-in-button";
import { safeNextPath } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in — Trego" };

// Set by the Google sign-in Route Handlers when they bounce back here.
const GOOGLE_ERRORS: Record<string, string> = {
  google_unconfigured:
    "Google sign-in isn’t set up on this server yet. Log in with your phone number for now.",
  google_failed: "Google sign-in was cancelled or didn’t complete. Please try again.",
  google_email_unverified:
    "Your Google account’s email address isn’t verified, so we can’t use it to sign you in.",
  suspended: "This account has been suspended.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const googleError = typeof error === "string" ? GOOGLE_ERRORS[error] : undefined;
  const nextPath = safeNextPath(next);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>

      <div className="mt-8">
        <GoogleSignInButton />
        {googleError ? (
          <p className="mt-3 text-sm text-danger">{googleError}</p>
        ) : null}
      </div>

      <AuthDivider label="or log in with your phone number" />

      <LoginForm next={nextPath} />

      <p className="mt-6 text-sm text-muted">
        No account yet?{" "}
        <Link
          href={nextPath === "/" ? "/register" : `/register?next=${encodeURIComponent(nextPath)}`}
          className="text-highlight underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
