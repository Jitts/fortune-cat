"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";

type State = { error: string } | { success: true } | null;

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData) => requestPasswordReset(formData),
    null,
  );

  const sent = state !== null && "success" in state;

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-neutral-900">
            🐱 Fortune Cat
          </Link>
          <p className="mt-2 text-sm text-neutral-500">Reset your password</p>
        </div>

        {sent ? (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
            If an account exists for that email, we&apos;ve sent a link to reset your password.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-neutral-500">
          <Link href="/login" className="font-medium text-neutral-900 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
