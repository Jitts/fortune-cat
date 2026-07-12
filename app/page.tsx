import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LandingDemo from "@/app/components/LandingDemo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <span className="text-xl font-bold text-neutral-900">🐱 Fortune Cat</span>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <Link
              href="/app"
              className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-800"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-medium text-neutral-600 hover:text-neutral-900">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-800"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
            Your money logs itself.
          </h1>
          <p className="text-lg text-neutral-600">
            Fortune Cat reads the SMS, emails and statements your banks already send you — parsed
            on your device, no bank login — and turns them into a live cash-flow ledger. Built for
            Singapore.
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
              className="rounded-lg px-5 py-3 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-100"
            >
              See Pro
            </Link>
          </div>
        </div>

        {/* Live capture-loop demo, entirely client-side */}
        <LandingDemo />
      </section>
    </main>
  );
}
