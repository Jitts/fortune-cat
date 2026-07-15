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
    <main className="min-h-screen bg-surface-2 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-line">
        <div>
          <h1 className="text-2xl font-bold text-ink">🐱 Fortune Cat Pro</h1>
          <p className="mt-2 text-ink-subtle">Unlock your full transaction history.</p>
        </div>

        <div className="text-4xl font-bold text-ink">
          $9.00 <span className="text-base font-normal text-ink-faint">one-time</span>
        </div>

        <ul className="space-y-2 text-left text-sm text-ink-muted">
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

        <Link href={user ? "/app" : "/"} className="block text-sm text-ink-faint hover:text-ink-muted">
          {user ? "Back to app" : "Back home"}
        </Link>
      </div>
    </main>
  );
}
