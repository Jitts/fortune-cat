import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GoProButton from "./GoProButton";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activePayment } = user
    ? await supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle()
    : { data: null };
  const isPro = !!activePayment;

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">🐱 Fortune Cat Pro</h1>
          <p className="mt-2 text-neutral-500">Unlock your full transaction history.</p>
        </div>

        <div className="text-4xl font-bold text-neutral-900">
          $9.00 <span className="text-base font-normal text-neutral-400">one-time</span>
        </div>

        <ul className="space-y-2 text-left text-sm text-neutral-600">
          <li>✓ Full transaction history (free tier shows last 10)</li>
          <li>✓ ✨ Pro badge</li>
          <li>✓ Supports future features</li>
        </ul>

        {isPro ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            ✨ You&apos;re already Pro — thank you!
          </p>
        ) : user ? (
          <GoProButton />
        ) : (
          <Link
            href="/login"
            className="block w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Log in to upgrade
          </Link>
        )}

        <Link href={user ? "/app" : "/"} className="block text-sm text-neutral-400 hover:text-neutral-600">
          {user ? "Back to app" : "Back home"}
        </Link>
      </div>
    </main>
  );
}
