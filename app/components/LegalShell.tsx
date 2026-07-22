import Link from "next/link";
import Wordmark from "@/app/components/Wordmark";

/**
 * Shared frame for the legal pages (/privacy, /terms): wordmark header,
 * narrow prose column, cross-links in the footer. Content is plain JSX
 * sections passed as children — each page owns its own words.
 */
export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-5 sm:px-0">
          <Link href="/" aria-label="Fortune Cat home">
            <Wordmark size="sm" />
          </Link>
          <Link href="/" className="text-sm text-ink-subtle hover:text-ink">
            ← Back home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-14 sm:px-0">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
          Last updated: {updated}
        </p>
        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-ink-muted [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-ink [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-ink">
          {children}
        </div>
      </article>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-ink-subtle sm:px-0">
          <span className="font-mono text-xs text-ink-faint">© Fortune Cat</span>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
