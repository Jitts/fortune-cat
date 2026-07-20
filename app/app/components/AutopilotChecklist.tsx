"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const HIDE_KEY = "fc-autopilot-hidden";

/**
 * First-run guide: three steps that end with the app running itself. Replaces
 * the dead-air empty dashboard — each step deep-links to the screen that
 * completes it. The card retires for good once all three are done; hiding it
 * only collapses it to a slim bar (still there, one click to reopen) since a
 * user who hides it may still want the reminder later.
 */
export default function AutopilotChecklist({
  captured,
  trusted,
  backfilled,
}: {
  captured: boolean;
  trusted: boolean;
  backfilled: boolean;
}) {
  // Start expanded so server/client match on first paint; reconcile with the
  // stored pick right after mount (same pattern as ThemeToggle).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem(HIDE_KEY) === "1");
  }, []);

  const steps = [
    {
      done: captured,
      title: "Capture your first transaction",
      hint: "Forward a bank SMS, connect email, or upload a statement",
      href: "/settings",
    },
    {
      done: trusted,
      title: "Trust your first sender",
      hint: "So the next one posts itself — undo is always one tap",
      href: captured ? "/review" : "/settings",
    },
    {
      done: backfilled,
      title: "Backfill last month",
      hint: "Upload one statement — PDF or a screenshot is fine",
      href: "/settings",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  if (doneCount === steps.length) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => {
          localStorage.removeItem(HIDE_KEY);
          setCollapsed(false);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border-t-2 border-gold bg-surface px-6 py-3 text-left shadow-sm ring-1 ring-line hover:bg-surface-2"
      >
        <span className="text-sm font-semibold text-ink">
          Get to autopilot{" "}
          <span className="font-mono text-xs font-normal text-ink-faint">
            {doneCount} of {steps.length}
          </span>
        </span>
        <span className="text-xs font-medium text-ink-subtle">Show</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-t-2 border-gold bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Get to autopilot{" "}
          <span className="font-mono text-xs font-normal text-ink-faint">
            {doneCount} of {steps.length}
          </span>
        </h2>
        <button
          onClick={() => {
            localStorage.setItem(HIDE_KEY, "1");
            setCollapsed(true);
          }}
          className="text-xs text-ink-faint hover:text-ink-muted"
        >
          Hide
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${Math.max(8, (doneCount / steps.length) * 100)}%` }}
        />
      </div>
      <ul className="mt-4 space-y-1">
        {steps.map((step) =>
          step.done ? (
            <li key={step.title} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-on-gold">
                ✓
              </span>
              <span className="text-sm text-ink-faint line-through">{step.title}</span>
            </li>
          ) : (
            <li key={step.title}>
              <Link
                href={step.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2"
              >
                <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-line" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{step.title}</span>
                  <span className="block truncate text-xs text-ink-subtle">{step.hint}</span>
                </span>
                <span className="ml-auto text-gold-text">›</span>
              </Link>
            </li>
          ),
        )}
      </ul>
      <p className="mt-3 text-xs text-ink-faint">
        When the third box ticks, this card retires and the ledger runs itself.
      </p>
    </div>
  );
}
