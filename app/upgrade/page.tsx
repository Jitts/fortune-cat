import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PRO_FEATURES, PRO_PRICE, PRO_TAGLINE } from "@/lib/proFeatures";
import { FREE_PRO_BETA } from "@/lib/beta";
import GoProButton from "./GoProButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fortune Cat Pro — US$9 once, every engine unlocked",
  description:
    "One payment unlocks Safe-to-Spend, goals, recurring radar, subscription kill-chain, deep analytics, full history and more. No subscription, no renewal.",
};

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
    <main className="min-h-screen bg-surface-2 px-5 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-6 overflow-hidden rounded-3xl bg-surface p-8 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.5)] ring-1 ring-line">
        <div className="text-center">
          <span className="chip chip-gold text-[11px]">Fortune Cat Pro</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
            Unlock every engine
          </h1>
          <p className="mt-2 text-sm text-ink-subtle">{PRO_TAGLINE}</p>
          {FREE_PRO_BETA ? (
            <div className="mt-5">
              <div className="font-display text-5xl font-extrabold text-ink">
                <span className="mr-2 align-middle text-2xl font-semibold text-ink-faint line-through">
                  {PRO_PRICE}
                </span>
                Free
              </div>
              <p className="mt-1.5 text-sm font-medium text-jade">
                Waived for beta testers — unlock now, keep it forever.
              </p>
            </div>
          ) : (
            <div className="mt-5 font-display text-5xl font-extrabold text-ink">
              {PRO_PRICE}{" "}
              <span className="align-middle text-base font-normal text-ink-faint">one-time</span>
            </div>
          )}
        </div>

        <ul className="grid gap-4 border-y border-line py-6">
          {PRO_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3.5">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-lg"
              >
                {f.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{f.title}</span>
                <span className="block text-xs leading-relaxed text-ink-muted">{f.desc}</span>
              </span>
            </li>
          ))}
        </ul>

        {isPro ? (
          <p className="rounded-xl bg-gold-soft px-4 py-3 text-center text-sm font-semibold text-gold-text">
            ✨ You&apos;re already Pro — thank you!
          </p>
        ) : user ? (
          <GoProButton label={FREE_PRO_BETA ? "Unlock Pro free — beta" : "Go Pro"} />
        ) : (
          <Link href="/login" className="btn btn-gold w-full px-4 py-3.5 text-sm">
            Log in to upgrade
          </Link>
        )}

        <Link href={user ? "/app" : "/"} className="block text-center text-sm text-ink-subtle hover:text-ink">
          {user ? "Back to app" : "Back home"}
        </Link>
      </div>
    </main>
  );
}
