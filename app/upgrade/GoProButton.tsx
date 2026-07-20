"use client";

import { useState } from "react";

export default function GoProButton({ label = "Go Pro" }: { label?: string }) {
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
    <div className="space-y-3">
      {error && <p className="text-sm text-vermilion">{error}</p>}
      <button onClick={handleGoPro} disabled={loading} className="btn btn-gold w-full px-4 py-3.5 text-sm">
        {loading ? "Redirecting…" : label}
      </button>
    </div>
  );
}
