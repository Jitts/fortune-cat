import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FaqSection from "@/app/components/FaqSection";
import Wordmark from "@/app/components/Wordmark";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questions, answered",
  description:
    "How Fortune Cat logs transactions without a bank login, what the free tier covers versus Pro, where your data is stored, and how to use it manually.",
  alternates: { canonical: "/faq" },
};

/**
 * The FAQ as a page of its own, reachable from inside the signed-in app.
 *
 * It previously existed only as a section of the marketing homepage, and every
 * wordmark in the app points at /app — so a signed-in user who wanted to
 * re-read an answer had no route to it at all short of signing out. A beta
 * tester hit exactly that: "I wanted to go back and read the FAQ again, but
 * there was no button to return."
 *
 * The back link is therefore the whole point of this page, and it follows who
 * you are: signed in it returns you to the ledger you came from, signed out to
 * the homepage. Sending a signed-in reader to a page of "Sign up free" buttons
 * would be its own small insult.
 */
export default async function FaqPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const back = user
    ? { href: "/app", label: "← Back to my ledger", short: "My ledger" }
    : { href: "/", label: "← Back home", short: "Home" };

  return (
    <main className="min-h-screen">
      {/* No border-b here: FaqSection carries its own border-t, and stacking
          the two renders a doubled 2px rule. */}
      <header>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
          {/* Wordmark goes to the public site, matching the app chrome; the
              explicit back link beside it is the one that follows who you are. */}
          <Link href="/" aria-label="Fortune Cat home">
            <Wordmark size="sm" />
          </Link>
          <Link href={back.href} className="text-sm text-ink-subtle hover:text-ink">
            {back.label}
          </Link>
        </div>
      </header>

      <FaqSection jsonLd={false} />

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-ink-subtle sm:px-8">
          <span className="font-mono text-xs text-ink-faint">© Fortune Cat</span>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href={back.href} className="hover:text-ink">
              {back.short}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
