"use client";

import { useState } from "react";
import { KNOWN_IMAP_HOSTS } from "@/lib/email/knownHosts";

export default function ConnectEmailForm({
  onSubmit,
  pending,
}: {
  onSubmit: (formData: FormData) => void;
  pending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("993");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hostTouched, setHostTouched] = useState(false);

  function handleEmailChange(value: string) {
    setEmail(value);
    if (hostTouched) return;
    const domain = value.split("@")[1]?.toLowerCase();
    const known = domain ? KNOWN_IMAP_HOSTS[domain] : undefined;
    if (known) {
      setHost(known.host);
      setPort(String(known.port));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!host.trim()) {
      setError("Enter the IMAP host for your provider.");
      return;
    }
    if (!password.trim()) {
      setError("Enter your app password.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("email", email);
    formData.set("imap_host", host);
    formData.set("imap_port", port);
    formData.set("password", password);
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-neutral-700">IMAP host</label>
          <input
            type="text"
            value={host}
            onChange={(e) => {
              setHost(e.target.value);
              setHostTouched(true);
            }}
            placeholder="imap.gmail.com"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">App password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••••••"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Use an app-specific password, not your regular login password — most providers (Gmail,
          Outlook, Yahoo, iCloud) require one for IMAP access when 2FA is on. We only ever read
          your inbox, never send, delete, or modify anything.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Connecting…" : "Connect inbox"}
      </button>
    </form>
  );
}
