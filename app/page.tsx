import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LandingDemo from "@/app/components/LandingDemo";
import ProShowcase from "@/app/components/ProShowcase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-surface-2">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <span className="text-xl font-bold text-ink">🐱 Fortune Cat</span>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <Link
              href="/app"
              className="rounded-lg bg-action px-4 py-2 font-semibold text-white hover:bg-action/90"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-medium text-ink-muted hover:text-ink">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-action px-4 py-2 font-semibold text-white hover:bg-action/90"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Your money logs itself.
          </h1>
          <p className="text-lg text-ink-muted">
            Fortune Cat reads the SMS, emails and statements your bank already sends you — parsed
            on your device, no bank login — and turns them into a live cash-flow ledger, in your
            own currency.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={user ? "/app" : "/signup"}
              className="rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600"
            >
              {user ? "Open your app" : "Start tracking — it's free"}
            </Link>
            <Link
              href="/upgrade"
              className="rounded-lg px-5 py-3 text-sm font-semibold text-ink-muted ring-1 ring-line hover:bg-surface-3"
            >
              See Pro
            </Link>
          </div>
        </div>

        {/* Live capture-loop demo, entirely client-side */}
        <LandingDemo />
      </section>

      <ProShowcase />
    </main>
  );
}
