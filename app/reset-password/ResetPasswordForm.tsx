"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/auth/actions";

type State = { error: string } | null;

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData) => updatePassword(formData),
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-muted">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-line focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      {state?.error && <p className="text-sm text-vermilion">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-white hover:bg-action/90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
