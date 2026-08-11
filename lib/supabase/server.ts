import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * The cookie list `setAll` receives, named explicitly because inference cannot
 * supply it here.
 *
 * @supabase/ssr 0.5.2 types its options as
 * `SupabaseClientOptions & { cookies: CookieMethodsServer }`, importing
 * `SupabaseClientOptions` from `@supabase/supabase-js/dist/module/lib/types`.
 * supabase-js 2.110 restructured its build and no longer ships a `dist/module/`
 * directory at all, so that path resolves to nothing, the intersection degrades,
 * and every callback in the object literal below falls back to `any`. With
 * `strict` on that surfaces as ten implicit-any errors in OUR files, which is
 * misleading — nothing here is wrong.
 *
 * It never broke at runtime because the failing import is `import type`, erased
 * before anything executes, and `next.config.ts` sets
 * `typescript.ignoreBuildErrors`, so no build ever complained either.
 *
 * Deriving the parameter from the library's own exported `SetAllCookies` keeps
 * this honest: if upstream changes the shape, this follows rather than drifting
 * the way a hand-written `{ name, value, options }[]` would. The real fix is the
 * version realignment noted in the commit; this makes the type checker usable
 * again without touching the auth path to get there.
 */
type CookiesToSet = Parameters<SetAllCookies>[0];

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies; middleware handles session refresh
          }
        },
      },
    },
  );
}
