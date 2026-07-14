import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  callbackUri,
  encryptTokenSet,
  exchangeCodeForTokens,
  getPrimaryEmail,
  msOAuthConfigured,
} from "@/lib/email/graphClient";
import { inboxLimit } from "@/lib/email/inboxLimits";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/microsoft/callback — completes the flow: verify the CSRF state,
 * exchange the code for tokens, read the mailbox address, and upsert the
 * connection (encrypted refresh token, no password). Always lands back on
 * /settings with a status the UI turns into a toast.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/settings?${q}`, origin));
    res.cookies.delete("ms_oauth_state");
    return res;
  };

  if (!msOAuthConfigured()) return back("error=oauth_unavailable");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (request.nextUrl.searchParams.get("error")) return back("error=oauth_denied");
  if (!code || !state) return back("error=oauth_state");

  // CSRF: the state must match the cookie we set at /start.
  const expected = request.cookies.get("ms_oauth_state")?.value;
  if (!expected || expected !== state) return back("error=oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", origin));

  try {
    const tokens = await exchangeCodeForTokens(code, callbackUri(origin));
    const email = await getPrimaryEmail(tokens.accessToken);
    if (!email) return back("error=oauth_email");

    // Re-check the cap here too — unless this is re-linking an inbox on file.
    const { data: existing } = await supabase
      .from("email_connections")
      .select("id, email")
      .eq("user_id", user.id);
    const already = (existing ?? []).some((c) => c.email.trim().toLowerCase() === email);
    if (!already) {
      const { data: activePayment } = await supabase
        .from("payments")
        .select("id")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if ((existing?.length ?? 0) >= inboxLimit(!!activePayment)) {
        return back("error=inbox_limit");
      }
    }

    const { data: saved, error } = await supabase
      .from("email_connections")
      .upsert(
        {
          user_id: user.id,
          email,
          auth_type: "microsoft",
          imap_host: null,
          imap_port: 993,
          encrypted_password: null,
          ...encryptTokenSet(tokens),
        },
        { onConflict: "user_id,email" },
      )
      .select("id")
      .single();

    if (error || !saved) {
      console.error("[oauth/microsoft/callback] upsert", error);
      return back("error=oauth_save");
    }

    await logAudit(supabase, {
      action: "email_connection.connected",
      entityType: "email_connection",
      entityId: saved.id,
      payload: { email, auth: "microsoft" },
      riskLevel: "medium",
      userId: user.id,
    });

    return back("connected=microsoft");
  } catch (err) {
    console.error("[oauth/microsoft/callback]", err);
    return back("error=oauth_failed");
  }
}
