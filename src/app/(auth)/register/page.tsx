import Link from "next/link";
import { AuthDivider, GoogleSignInButton } from "@/components/google-sign-in-button";
import { safeNextPath } from "@/lib/site";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create an account — Trego" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        We use your phone number to verify who you are and to text you about
        offers and orders.
      </p>

      <div className="mt-8">
        <GoogleSignInButton label="Sign up with Google" />
      </div>

      <AuthDivider label="or sign up with your phone number" />

      <RegisterForm next={nextPath} />

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={nextPath === "/" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`}
          className="text-highlight underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
