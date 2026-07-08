import type { SupabaseClient } from "@supabase/supabase-js";

type RiskLevel = "low" | "medium" | "high" | "critical";

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Record<string, unknown>;
    riskLevel?: RiskLevel;
    userId?: string | null;
  },
) {
  await supabase.from("audit_logs").insert({
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    payload: params.payload ?? {},
    risk_level: params.riskLevel ?? "low",
    user_id: params.userId ?? null,
  });
}
