import { requireUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/site";
import { toLocalPhone } from "@/lib/phone";
import { ShieldCheckIcon } from "@/components/icons";
import { VerifyPhoneForm } from "./verify-phone-form";

export const metadata = { title: "Verify your phone — Trego" };

export default async function VerifyPhonePage({
  searchParams,
}: PageProps<"/account/verify-phone">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next, "/account");
  const user = await requireUser(`/account/verify-phone?next=${encodeURIComponent(nextPath)}`);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {user.phoneVerifiedAt ? "Change your phone number" : "Verify your phone number"}
      </h1>
      {user.phoneVerifiedAt ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-highlight">
          <ShieldCheckIcon />
          {toLocalPhone(user.phoneNumber)} is verified.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Selling, messaging sellers, making offers and paying through escrow
          all need a verified number, so everyone in a deal can be reached.
          We’ll text you a 6-digit code.
        </p>
      )}
      <VerifyPhoneForm initialPhone={toLocalPhone(user.phoneNumber)} next={nextPath} />
    </div>
  );
}
