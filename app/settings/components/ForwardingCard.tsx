"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  disableForwarding,
  dismissForwardingCode,
  enableForwarding,
  rotateForwardingAddress,
} from "../forwardingActions";

export type ForwardingState = {
  address: string | null;
  lastReceivedAt: string | null;
  receivedCount: number;
  pendingCode: string | null;
};

/**
 * Forwarding — the capture channel that asks for no credential at all.
 *
 * This sits directly beneath the inbox-connection card on purpose. That card
 * asks for an app password, which is one credential reaching every folder with
 * the ability to send as you, and beta testers refused it. Sender scoping made
 * that ask smaller; this makes it unnecessary. Someone who will never hand over
 * a password can still use the product, and the choice is visible at the exact
 * moment they are deciding rather than buried elsewhere in settings.
 */
export default function ForwardingCard({
  initial,
  available,
  locale,
  timezone,
  className,
}: {
  initial: ForwardingState | null;
  /** False when the inbound mailbox isn't configured on the server. */
  available: boolean;
  locale: string;
  timezone: string;
  className?: string;
}) {
  const [state, setState] = useState<ForwardingState | null>(initial);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setState(initial), [initial]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!available) return null;

  const on = Boolean(state?.address);

  function handleEnable() {
    setError(null);
    startTransition(async () => {
      const result = await enableForwarding();
      if (result.error || !result.address) {
        setError(result.error ?? "Forwarding isn't available yet.");
        return;
      }
      setState({ address: result.address, lastReceivedAt: null, receivedCount: 0, pendingCode: null });
      setShowGuide(true);
    });
  }

  function handleRotate() {
    setError(null);
    startTransition(async () => {
      const result = await rotateForwardingAddress();
      setConfirmRotate(false);
      if (result.error || !result.address) {
        setError(result.error ?? "Forwarding isn't available yet.");
        return;
      }
      const address = result.address;
      setState((prev) => (prev ? { ...prev, address, pendingCode: null } : prev));
    });
  }

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      const result = await disableForwarding();
      if (result.error) {
        setError(result.error);
        return;
      }
      setState(null);
      setShowGuide(false);
    });
  }

  function handleDismissCode() {
    startTransition(async () => {
      await dismissForwardingCode();
      setState((prev) => (prev ? { ...prev, pendingCode: null } : prev));
    });
  }

  async function copyAddress() {
    if (!state?.address) return;
    try {
      await navigator.clipboard.writeText(state.address);
      setCopied(true);
    } catch {
      setError("Couldn't copy — select the address and copy it manually.");
    }
  }

  return (
    <div id="capture-forwarding" className={className}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-ink-subtle">📮 Forward your receipts</h2>
        <span
          className={
            on
              ? "rounded-full bg-jade-soft px-2.5 py-0.5 font-mono text-[10px] font-medium text-jade"
              : "rounded-full bg-surface-3 px-2.5 py-0.5 font-mono text-[10px] text-ink-subtle"
          }
        >
          {on ? "ON" : "OFF"}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        No password, nothing to connect. You get your own Fortune Cat address; forward a bank
        alert or receipt to it and it turns up in{" "}
        <Link href="/review" className="underline hover:text-ink-muted">
          Review
        </Link>
        . We only ever see the messages you send — no folder, no history, no access to your
        mailbox.
      </p>

      {!on ? (
        <button
          type="button"
          onClick={handleEnable}
          disabled={pending}
          className="btn btn-gold mt-3 min-h-11 px-4 text-sm disabled:opacity-50"
        >
          {pending ? "Setting up…" : "Get my forwarding address"}
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          {/* Gmail's confirmation code. Google mails this to the destination —
              an inbox the person can't open, because it's ours. Catching it is
              the difference between the auto-forward path working and being
              impossible to finish. */}
          {state?.pendingCode && (
            <div className="rounded-lg border border-gold/40 bg-gold-soft p-3">
              <p className="text-xs font-semibold text-ink">Gmail sent a confirmation code</p>
              <p className="mt-1 text-xs text-ink-muted">
                Paste this back into Gmail&rsquo;s forwarding settings to finish setting up your
                rule.
              </p>
              <p className="mt-2 select-all font-mono text-lg font-semibold tracking-wider text-ink">
                {state.pendingCode}
              </p>
              <button
                type="button"
                onClick={handleDismissCode}
                disabled={pending}
                className="mt-2 text-[11px] font-medium text-ink-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
              >
                Done with this
              </button>
            </div>
          )}

          <div className="rounded-lg bg-surface-2 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
              Your forwarding address
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-ink">{state?.address}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copyAddress}
                className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-ink-muted ring-1 ring-line hover:bg-surface-3"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <span className="font-mono text-[10px] text-ink-faint">
                {state?.lastReceivedAt
                  ? `${state.receivedCount} forwarded · last ${new Date(state.lastReceivedAt).toLocaleString(locale, { timeZone: timezone })}`
                  : "nothing forwarded yet"}
              </span>
            </div>
          </div>

          {/* Said plainly rather than buried in a privacy page: the address
              travels in the To: header of everything sent to it, so it reaches
              anyone else on those threads. Forced review is what makes that
              safe, and people should know why it works that way. */}
          <p className="text-[11px] leading-relaxed text-ink-faint">
            Treat this like a mailbox name rather than a password — it shows up in the headers of
            anything you forward. That&rsquo;s why <b>everything forwarded waits in Review</b> and
            never posts to your ledger on its own, even from a sender you trust. If it ever starts
            attracting junk, change it below.
          </p>

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            {showGuide ? "Hide setup guide" : "How do I forward automatically?"}
          </button>

          {showGuide && (
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-xs text-ink-muted">
              <p className="font-semibold text-ink">Right now, with no setup</p>
              <p className="mt-1">
                Open any bank alert or receipt and hit <b>Forward</b> to the address above. It
                appears in Review within a few seconds. That&rsquo;s the whole thing — the steps
                below only matter if you&rsquo;d rather not do it by hand each time.
              </p>

              <p className="mt-3 font-semibold text-ink">Gmail, automatically — about 3 minutes</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>
                  In Gmail on a computer, open <b>Settings</b> (the gear, then <b>See all
                  settings</b>) → <b>Forwarding and POP/IMAP</b>
                </li>
                <li>
                  Click <b>Add a forwarding address</b> and paste the address above, then{" "}
                  <b>Next</b> → <b>Proceed</b>
                </li>
                <li>
                  Google emails a confirmation code to that address. It arrives here —{" "}
                  <b>come back to this page and it&rsquo;ll be waiting at the top of this card</b>
                </li>
                <li>Paste the code into Gmail and click <b>Verify</b></li>
                <li>
                  Now go to <b>Filters and Blocked Addresses</b> → <b>Create a new filter</b>. Put
                  your bank&rsquo;s address in <b>From</b> (for example{" "}
                  <span className="font-mono">alerts@yourbank.com</span>) and click{" "}
                  <b>Create filter</b>
                </li>
                <li>
                  Tick <b>Forward it to</b> and pick your Fortune Cat address, then{" "}
                  <b>Create filter</b>
                </li>
              </ol>
              <p className="mt-2 text-ink-subtle">
                Filter by your bank rather than forwarding everything — a rule that forwards your
                whole inbox sends us far more than we need, and you can add a second filter per
                bank any time.
              </p>

              <p className="mt-3 font-semibold text-ink">Outlook</p>
              <p className="mt-1">
                <b>Settings</b> → <b>Mail</b> → <b>Rules</b> → <b>Add new rule</b>. Condition{" "}
                <b>From</b> = your bank, action <b>Forward to</b> = the address above. Outlook
                doesn&rsquo;t ask for a confirmation code.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-vermilion">{error}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {confirmRotate ? (
              <>
                <span className="text-[11px] text-ink-muted">
                  New address, old one stops working. Any forwarding rule you&rsquo;ve set up will
                  need updating.
                </span>
                <button
                  type="button"
                  onClick={handleRotate}
                  disabled={pending}
                  className="rounded-lg bg-vermilion px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Changing…" : "Change it"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRotate(false)}
                  className="text-[11px] font-medium text-ink-muted underline underline-offset-2"
                >
                  Keep it
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmRotate(true)}
                  className="text-[11px] font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
                >
                  Change my address
                </button>
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={pending}
                  className="text-[11px] font-medium text-ink-muted underline underline-offset-2 hover:text-vermilion disabled:opacity-50"
                >
                  Turn forwarding off
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!on && error && <p className="mt-2 text-xs text-vermilion">{error}</p>}
    </div>
  );
}
