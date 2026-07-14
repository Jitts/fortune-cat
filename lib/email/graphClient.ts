// Microsoft (Outlook/Hotmail/365) email via OAuth + Microsoft Graph — the
// modern-auth alternative to app-password IMAP, which Microsoft has retired for
// personal accounts. Server-only: uses fetch, crypto, and html-to-text.
//
// Read-only: the requested scope is Mail.Read; Fortune Cat can read receipts and
// nothing else. Tokens are encrypted at rest by the caller / helpers here.
import { htmlToText } from "html-to-text";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { FetchedEmail } from "@/lib/email/imapClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

// "common" tenant → both personal (Outlook/Hotmail) and work/school accounts.
const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
// offline_access → refresh token; Mail.Read → read-only mail; User.Read → /me.
const SCOPES = ["offline_access", "Mail.Read", "User.Read"];

export function msOAuthConfigured(): boolean {
  return !!(process.env.MICROSOFT_OAUTH_CLIENT_ID && process.env.MICROSOFT_OAUTH_CLIENT_SECRET);
}

function clientId(): string {
  const id = process.env.MICROSOFT_OAUTH_CLIENT_ID;
  if (!id) throw new Error("MICROSOFT_OAUTH_CLIENT_ID is not set");
  return id;
}

function clientSecret(): string {
  const secret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  if (!secret) throw new Error("MICROSOFT_OAUTH_CLIENT_SECRET is not set");
  return secret;
}

// The redirect URI must match one registered on the Azure app. Derived from the
// request origin by default; override with MICROSOFT_OAUTH_REDIRECT_URI if the
// public domain differs from what the server sees.
export function callbackUri(origin: string): string {
  return process.env.MICROSOFT_OAUTH_REDIRECT_URI || `${origin}/api/oauth/microsoft/callback`;
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
    prompt: "select_account",
  });
  return `${AUTHORITY}/authorize?${params.toString()}`;
}

export type TokenSet = { accessToken: string; refreshToken: string; expiresAt: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTokenSet(json: any, fallbackRefresh?: string): TokenSet {
  const expiresInSec = Number(json.expires_in ?? 3600);
  return {
    accessToken: json.access_token,
    // Microsoft doesn't always rotate the refresh token — keep the old one if so.
    refreshToken: json.refresh_token ?? fallbackRefresh ?? "",
    expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString(),
  };
}

async function postToken(body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `token endpoint ${res.status}`);
  }
  return toTokenSet(json, body.refresh_token);
}

export function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenSet> {
  return postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
  });
}

function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES.join(" "),
  });
}

export async function getPrimaryEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${GRAPH}/me?$select=mail,userPrincipalName`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || "could not read account email");
  return String(json.mail || json.userPrincipalName || "").toLowerCase();
}

// Encrypts a fresh token set into the row shape stored on email_connections.
export function encryptTokenSet(set: TokenSet) {
  return {
    oauth_access_token: encryptSecret(set.accessToken),
    oauth_refresh_token: encryptSecret(set.refreshToken),
    oauth_token_expires_at: set.expiresAt,
  };
}

type OAuthConnRow = {
  id: string;
  oauth_access_token: string | null;
  oauth_refresh_token: string | null;
  oauth_token_expires_at: string | null;
};

// Returns a live Graph access token for a stored connection, refreshing and
// persisting when the current one is missing or within two minutes of expiry.
export async function ensureGraphAccessToken(db: Db, conn: OAuthConnRow): Promise<string> {
  if (!conn.oauth_refresh_token) {
    throw new Error("inbox is missing its Microsoft sign-in — reconnect it");
  }
  const expMs = conn.oauth_token_expires_at ? Date.parse(conn.oauth_token_expires_at) : 0;
  if (conn.oauth_access_token && expMs - Date.now() > 120_000) {
    return decryptSecret(conn.oauth_access_token);
  }

  const refreshed = await refreshTokens(decryptSecret(conn.oauth_refresh_token));
  await db.from("email_connections").update(encryptTokenSet(refreshed)).eq("id", conn.id);
  return refreshed.accessToken;
}

// Most recent inbox messages via Graph, mapped to the same shape the IMAP
// scanner produces so processFetchedEmails works unchanged. Read-only.
export async function fetchRecentMessagesGraph(accessToken: string, limit = 50): Promise<FetchedEmail[]> {
  // Built by hand so the OData "$" params aren't percent-encoded away.
  const query =
    `$top=${Math.min(limit, 50)}` +
    `&$select=internetMessageId,subject,from,receivedDateTime,body,bodyPreview` +
    `&$orderby=receivedDateTime%20desc`;
  const res = await fetch(`${GRAPH}/me/mailFolders/inbox/messages?${query}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || `graph messages ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = Array.isArray(json.value) ? json.value : [];
  return messages.map((m): FetchedEmail => {
    const isHtml = String(m.body?.contentType).toLowerCase() === "html";
    const text = m.body?.content
      ? isHtml
        ? htmlToText(m.body.content)
        : String(m.body.content)
      : (m.bodyPreview ?? "");
    return {
      messageId: m.internetMessageId || m.id,
      date: m.receivedDateTime ? new Date(m.receivedDateTime) : new Date(),
      from: m.from?.emailAddress?.address ?? "",
      subject: m.subject ?? "",
      text,
    };
  });
}
