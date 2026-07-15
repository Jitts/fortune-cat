import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only reachable with the temporary session /auth/callback establishes
  // from a valid recovery link — no session means an expired/invalid link.
  if (!user) redirect("/forgot-password");

  return (
    <main className="min-h-screen bg-surface-2 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-line">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-ink">
            🐱 Fortune Cat
          </Link>
          <p className="mt-2 text-sm text-ink-subtle">Choose a new password</p>
        </div>

        <ResetPasswordForm />
      </div>
    </main>
  );
}
