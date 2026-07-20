"use client";

import { useActionState } from "react";
import Link from "next/link";
import Wordmark from "@/app/components/Wordmark";

type AuthResult = { error: string };

export default function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: (formData: FormData) => Promise<AuthResult>;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: AuthResult | null, formData: FormData) => action(formData),
    null,
  );

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen bg-surface-2 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-line">
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="Fortune Cat home">
            <Wordmark size="lg" />
          </Link>
          <p className="mt-3 text-sm text-ink-subtle">
            {isSignup ? "Create your account" : "Welcome back"}
          </p>
        </div>

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
              className="field"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="field"
              placeholder="••••••••"
            />
          </div>

          {state?.error && <p className="text-sm text-vermilion">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="btn btn-gold w-full px-4 py-2.5 text-sm"
          >
            {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>

          {!isSignup && (
            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-ink-subtle hover:underline">
                Forgot password?
              </Link>
            </p>
          )}
        </form>

        <p className="text-center text-sm text-ink-subtle">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-ink hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="font-medium text-ink hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
