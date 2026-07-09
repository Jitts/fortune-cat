import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEMO_ROWS = [
  { icon: "🎬", note: "Streaming subscription", meta: "Entertainment", amount: "-$19.99", income: false },
  { icon: "💡", note: "Electricity bill", meta: "Utilities", amount: "-$65.00", income: false },
  { icon: "🛍️", note: "New headphones", meta: "Shopping", amount: "-$134.99", income: false },
  { icon: "💰", note: "Monthly salary", meta: "Salary", amount: "+$3,200.00", income: true },
];

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
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            See where your money goes.
          </h1>
          <p className="text-lg text-neutral-600">
            Fortune Cat does one thing well: log money in and out, watch your balance, and
            understand your spending by category. No spreadsheets, no bloat.
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

        {/* Static product preview */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <p className="text-xs font-medium text-neutral-400">Balance</p>
          <p className="text-3xl font-bold text-neutral-900">$2,909.52</p>
          <div className="mt-4 space-y-1">
            {DEMO_ROWS.map((r) => (
              <div key={r.note} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <span className="text-xl">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">{r.note}</p>
                  <p className="truncate text-xs text-neutral-400">{r.meta}</p>
                </div>
                <span
                  className={`text-sm font-semibold ${r.income ? "text-green-600" : "text-neutral-900"}`}
                >
                  {r.amount}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-neutral-400">
            A peek at the app — sign up to start your own.
          </p>
        </div>
      </section>
    </main>
  );
}
