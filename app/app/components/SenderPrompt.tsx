"use client";

import { useEffect, useState, useTransition } from "react";
import { closeSenderRule, openSenderRule } from "@/app/settings/senderActions";
import type { PendingSender } from "@/lib/email/pendingSenders";

/**
 * "We saw mail from this sender. May we open it?"
 *
 * A scan reads sender lines first and opens only senders the reader has
 * approved, so an unknown sender has to be asked about somewhere. This is that
 * somewhere, and it lives in Review because Review is already the habit — the
 * place people go to say yes or no about captures. Asking here costs no setup
 * step, which is the whole reason this beat an upfront checklist: the previous
 * design put a list of domain names in front of someone at the exact moment
 * they were most nervous, before the app had done anything for them.
 *
 * Everything shown here comes from an envelope — sender, subject, date. No
 * message body has been read at the point this renders, which is what makes it
 * honest to show at all.
 */
export default function SenderPrompt({ senders }: { senders: PendingSender[] }) {
  const [pending, setPending] = useState(senders);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setPending(senders), [senders]);

  if (pending.length === 0) return null;

  function decide(pattern: string, open: boolean) {
    setBusy(pattern);
    startTransition(async () => {
      const result = open ? await openSenderRule(pattern) : await closeSenderRule(pattern);
      setBusy(null);
      // Drop it either way — a decision is a decision, and leaving a decided
      // sender on screen invites a second, contradictory tap.
      if (!("error" in result)) setPending((prev) => prev.filter((s) => s.pattern !== pattern));
    });
  }

  return (
    <section
      aria-label="Senders awaiting a decision"
      className="rounded-2xl border border-gold/40 bg-gold-soft p-5"
    >
      <h3 className="text-sm font-semibold text-ink">
        New senders{" "}
        <span className="font-mono text-xs font-normal text-ink-muted">{pending.length}</span>
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        We&rsquo;ve seen these writing to you but haven&rsquo;t opened anything from them. Only the
        sender and subject line — never the message itself.
      </p>

      <ul className="mt-4 space-y-2.5">
        {pending.map((s) => (
          <li key={s.pattern} className="rounded-xl bg-surface p-3.5">
            <p className="text-sm font-medium text-ink">{s.pattern}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {s.messageCount} message{s.messageCount === 1 ? "" : "s"}
              {s.looksTransactional ? " · looks like receipts" : ""}
            </p>
            {s.sampleSubject && (
              <p className="mt-1.5 truncate font-mono text-[11px] text-ink-faint">
                {s.sampleSubject}
              </p>
            )}
            {/* Shows what a yes actually covers. Someone asking "will this open
                my Spotify marketing too?" can see the answer rather than
                guess at it. */}
            {s.addresses.length > 1 && (
              <p className="mt-1 text-[11px] text-ink-faint">
                from {s.addresses.slice(0, 3).join(", ")}
                {s.addresses.length > 3 ? ` and ${s.addresses.length - 3} more` : ""}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => decide(s.pattern, true)}
                disabled={busy === s.pattern}
                className="btn btn-gold min-h-9 px-3.5 text-xs disabled:opacity-50"
              >
                {busy === s.pattern ? "…" : "Open these"}
              </button>
              <button
                onClick={() => decide(s.pattern, false)}
                disabled={busy === s.pattern}
                className="min-h-9 rounded-lg px-3.5 text-xs font-medium text-ink-muted ring-1 ring-line hover:bg-surface-3 disabled:opacity-50"
              >
                Never this sender
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
