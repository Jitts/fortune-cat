import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PRO_FEATURES, PRO_PRICE, PRO_TAGLINE } from "@/lib/proFeatures";
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
    <main className="min-h-screen bg-surface-2 px-6 py-12">
      <div className="mx-auto w-full max-w-lg space-y-6 rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-line">
        <div className="text-center">
          <span className="inline-block rounded-full bg-fortune-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-fortune-700">
            Fortune Cat Pro
          </span>
          <h1 className="mt-3 text-2xl font-bold text-ink">Unlock every engine</h1>
          <p className="mt-2 text-sm text-ink-subtle">{PRO_TAGLINE}</p>
          <div className="mt-4 text-4xl font-bold text-ink">
            {PRO_PRICE} <span className="text-base font-normal text-ink-faint">one-time</span>
          </div>
        </div>

        <ul className="space-y-3 border-y border-line py-5">
          {PRO_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="mt-0.5 text-lg" aria-hidden>
                {f.icon}
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">{f.title}</span>
                <span className="block text-xs leading-relaxed text-ink-muted">{f.desc}</span>
              </span>
            </li>
          ))}
        </ul>

        {isPro ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700">
            ✨ You&apos;re already Pro — thank you!
          </p>
        ) : user ? (
          <GoProButton />
        ) : (
          <Link
            href="/login"
            className="block w-full rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-amber-600"
          >
            Log in to upgrade
          </Link>
        )}

        <Link href={user ? "/app" : "/"} className="block text-center text-sm text-ink-faint hover:text-ink-muted">
          {user ? "Back to app" : "Back home"}
        </Link>
      </div>
    </main>
  );
}
