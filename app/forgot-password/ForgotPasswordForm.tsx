"use client";

import { useActionState } from "react";
import Link from "next/link";
import Wordmark from "@/app/components/Wordmark";
import { requestPasswordReset } from "@/app/auth/actions";

type State = { error: string } | { success: true } | null;

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData) => requestPasswordReset(formData),
    null,
  );

  const sent = state !== null && "success" in state;

  return (
    <main className="min-h-screen bg-surface-2 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-line">
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="Fortune Cat home">
            <Wordmark size="lg" />
          </Link>
          <p className="mt-3 text-sm text-ink-subtle">Reset your password</p>
        </div>

        {sent ? (
          <p className="rounded-lg bg-jade-soft px-4 py-3 text-center text-sm text-jade">
            If an account exists for that email, we&apos;ve sent a link to reset your password.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-muted">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-line focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            {state && "error" in state && <p className="text-sm text-vermilion">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-white hover:bg-action/90 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-ink-subtle">
          <Link href="/login" className="font-medium text-ink hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
