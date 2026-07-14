import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl, callbackUri, msOAuthConfigured } from "@/lib/email/graphClient";
import { inboxLimit } from "@/lib/email/inboxLimits";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/microsoft/start — begins the "Continue with Microsoft" flow.
 * Requires an authenticated user, enforces the inbox cap up front, sets a
 * signed-ish state cookie for CSRF, and redirects to Microsoft's consent page.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const settings = (q: string) => NextResponse.redirect(new URL(`/settings?${q}`, origin));

  if (!msOAuthConfigured()) return settings("error=oauth_unavailable");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", origin));

  // Enforce the per-tier cap before sending the user to Microsoft.
  const { data: existing } = await supabase
    .from("email_connections")
    .select("id")
    .eq("user_id", user.id);
  const { data: activePayment } = await supabase
    .from("payments")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if ((existing?.length ?? 0) >= inboxLimit(!!activePayment)) {
    return settings("error=inbox_limit");
  }

  const state = randomUUID();
  const res = NextResponse.redirect(buildAuthorizeUrl(callbackUri(origin), state));
  res.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
