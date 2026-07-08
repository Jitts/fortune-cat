"use client";

import { useState } from "react";
import Link from "next/link";

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoPro() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not start checkout — please try again.");
    } catch {
      setError("Could not start checkout — please try again.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">🐱 Fortune Cat Pro</h1>
          <p className="mt-2 text-neutral-500">Unlock your full transaction history.</p>
        </div>

        <div className="text-4xl font-bold text-neutral-900">
          $9.00 <span className="text-base font-normal text-neutral-400">one-time</span>
        </div>

        <ul className="space-y-2 text-left text-sm text-neutral-600">
          <li>✓ Full transaction history (free tier shows last 10)</li>
          <li>✓ ✨ Pro badge</li>
          <li>✓ Supports future features</li>
        </ul>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleGoPro}
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "Go Pro"}
        </button>

        <Link href="/app" className="block text-sm text-neutral-400 hover:text-neutral-600">
          Back to app
        </Link>
      </div>
    </main>
  );
}
