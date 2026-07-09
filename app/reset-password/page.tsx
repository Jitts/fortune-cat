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
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-neutral-900">
            🐱 Fortune Cat
          </Link>
          <p className="mt-2 text-sm text-neutral-500">Choose a new password</p>
        </div>

        <ResetPasswordForm />
      </div>
    </main>
  );
}
