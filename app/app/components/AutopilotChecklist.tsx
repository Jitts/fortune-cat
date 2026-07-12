"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const HIDE_KEY = "fc-autopilot-hidden";

/**
 * First-run guide: three steps that end with the app running itself. Replaces
 * the dead-air empty dashboard — each step deep-links to the screen that
 * completes it, and the card disappears for good once all three are done
 * (or the user hides it).
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
  // Render nothing until mounted so a locally-hidden card never flashes in.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(localStorage.getItem(HIDE_KEY) !== "1");
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

  if (!visible || doneCount === steps.length) return null;

  return (
    <div className="rounded-2xl border-t-2 border-fortune-400 bg-white p-6 shadow-sm ring-1 ring-neutral-200">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">
          🐱 Get to autopilot{" "}
          <span className="font-mono text-xs font-normal text-neutral-400">
            {doneCount} of {steps.length}
          </span>
        </h2>
        <button
          onClick={() => {
            localStorage.setItem(HIDE_KEY, "1");
            setVisible(false);
          }}
          className="text-xs text-neutral-400 hover:text-neutral-600"
        >
          Hide
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-fortune-400 transition-all"
          style={{ width: `${Math.max(8, (doneCount / steps.length) * 100)}%` }}
        />
      </div>
      <ul className="mt-4 space-y-1">
        {steps.map((step) =>
          step.done ? (
            <li key={step.title} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fortune-400 text-[11px] font-bold text-fortune-700">
                ✓
              </span>
              <span className="text-sm text-neutral-400 line-through">{step.title}</span>
            </li>
          ) : (
            <li key={step.title}>
              <Link
                href={step.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50"
              >
                <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-neutral-300" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-900">{step.title}</span>
                  <span className="block truncate text-xs text-neutral-500">{step.hint}</span>
                </span>
                <span className="ml-auto text-fortune-700">›</span>
              </Link>
            </li>
          ),
        )}
      </ul>
      <p className="mt-3 text-xs text-neutral-400">
        When the third box ticks, this card retires and the ledger runs itself.
      </p>
    </div>
  );
}
